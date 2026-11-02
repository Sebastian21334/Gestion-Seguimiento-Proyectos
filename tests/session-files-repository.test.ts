import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/shared/db", () => ({ db: { transaction: mocks.transaction } }));

import { removeReport, saveReport } from "@/modules/work-sessions/repository";
import { workSessionReports, workSessionReportChanges } from "@/modules/work-sessions/schema";

const teamId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";
const userId = "00000000-0000-4000-8000-000000000003";
const reportId = "00000000-0000-4000-8000-000000000004";
const dialect = new PgDialect();

function transactionFixture({ authorized = true, reportExists = true, auditFails = false } = {}) {
  const sessionWhere = vi.fn((_condition: SQL) => ({ limit: async () => authorized ? [{ id: sessionId }] : [] }));
  const deleteWhere = vi.fn((_condition: SQL) => ({ returning: async () => reportExists ? [{ id: reportId, name: "cambios.md" }] : [] }));
  const fileValues = vi.fn(() => ({ returning: async () => [{ id: reportId, name: "cambios.md" }] }));
  const auditValues = vi.fn(async () => { if (auditFails) throw new Error("No se pudo guardar el historial"); });
  const tx = {
    execute: vi.fn(async () => {}),
    select: vi.fn(() => ({ from: () => ({ where: sessionWhere }) })),
    insert: vi.fn((table: unknown) => {
      if (table === workSessionReports) return { values: fileValues };
      if (table === workSessionReportChanges) return { values: auditValues };
      throw new Error("Tabla inesperada");
    }),
    delete: vi.fn(() => ({ where: deleteWhere })),
  };
  mocks.transaction.mockImplementation(async callback => callback(tx));
  return { tx, sessionWhere, deleteWhere, fileValues, auditValues };
}

describe("adjuntos e historial dentro de la misma transacción", () => {
  beforeEach(() => { mocks.transaction.mockReset(); });

  it("agrega archivos y su historial sin exigir tarea activa ni actualizar datos de la sesión", async () => {
    const fixture = transactionFixture();
    await expect(saveReport(teamId, sessionId, userId, [{ name: "cambios.md", content: "# Cambios" }])).resolves.toEqual({ id: sessionId });
    const query = dialect.sqlToQuery(fixture.sessionWhere.mock.calls[0][0] as SQL);
    expect(query.sql).toContain('"work_sessions"."user_id"');
    expect(query.sql).toContain('"work_sessions"."team_id"');
    expect(query.sql).not.toContain('"status"');
    expect(query.params).toEqual([teamId, sessionId, userId]);
    expect(fixture.fileValues).toHaveBeenCalledWith([{ sessionId, name: "cambios.md", content: "# Cambios" }]);
    expect(fixture.auditValues).toHaveBeenCalledWith([{ sessionId, reportId, name: "cambios.md", userId, action: "added" }]);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(fixture.tx.delete).not.toHaveBeenCalled();
  });

  it("elimina por ID de archivo y sesión, guardando nombre y autor en el historial", async () => {
    const fixture = transactionFixture();
    await expect(removeReport(teamId, sessionId, reportId, userId)).resolves.toEqual({ id: reportId, name: "cambios.md" });
    expect(dialect.sqlToQuery(fixture.sessionWhere.mock.calls[0][0] as SQL).params).toEqual([teamId, sessionId, userId]);
    expect(dialect.sqlToQuery(fixture.deleteWhere.mock.calls[0][0] as SQL).params).toEqual([sessionId, reportId]);
    expect(fixture.tx.delete).toHaveBeenCalledWith(workSessionReports);
    expect(fixture.auditValues).toHaveBeenCalledWith({ sessionId, reportId, name: "cambios.md", userId, action: "removed" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("no modifica archivos ni registra cambios si la sesión pertenece a otro usuario o equipo", async () => {
    const fixture = transactionFixture({ authorized: false });
    await expect(saveReport(teamId, sessionId, userId, [{ name: "a.md", content: "Cambios" }])).resolves.toBeUndefined();
    await expect(removeReport(teamId, sessionId, reportId, userId)).resolves.toBeUndefined();
    expect(fixture.tx.insert).not.toHaveBeenCalled();
    expect(fixture.tx.delete).not.toHaveBeenCalled();
  });

  it("no duplica el historial al volver a eliminar un adjunto inexistente", async () => {
    const fixture = transactionFixture({ reportExists: false });
    await expect(removeReport(teamId, sessionId, reportId, userId)).resolves.toBeUndefined();
    expect(fixture.auditValues).not.toHaveBeenCalled();
  });

  it("propaga el fallo del historial dentro de la transacción para revertir la modificación", async () => {
    transactionFixture({ auditFails: true });
    await expect(saveReport(teamId, sessionId, userId, [{ name: "a.md", content: "Cambios" }])).rejects.toThrow("No se pudo guardar el historial");
    await expect(removeReport(teamId, sessionId, reportId, userId)).rejects.toThrow("No se pudo guardar el historial");
  });
});
