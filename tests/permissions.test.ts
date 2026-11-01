import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUser } from "@/modules/users";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  teamMembers: vi.fn(),
  insertDoc: vi.fn(),
  findDoc: vi.fn(),
  removeDoc: vi.fn(),
  findInvitation: vi.fn(),
  claimInvitation: vi.fn(),
  joinTeam: vi.fn(),
  boardActive: vi.fn(),
  boardHistory: vi.fn(),
  start: vi.fn(),
  listReports: vi.fn(),
  leaveIfUnchanged: vi.fn(),
  findUserContacts: vi.fn(),
  findTeamId: vi.fn(),
  findTeam: vi.fn(),
}));
vi.mock("@/modules/teams/repository", () => ({
  membership: mocks.membership,
  members: mocks.teamMembers,
  leaveIfUnchanged: mocks.leaveIfUnchanged,
  findIdBySlug: mocks.findTeamId,
  findById: mocks.findTeam,
}));
vi.mock("@/modules/users", () => ({
  findUserContactsByIds: mocks.findUserContacts,
  findUsersByIds: async () => [],
}));
vi.mock("@/modules/gantt", () => ({
  getGantt: async () => ({ diagrams: [], tasks: [] }),
  getSessionTask: async () => ({}),
  startSessionTask: async () => {},
}));
vi.mock("@/modules/documents/repository", () => ({
  insert: mocks.insertDoc,
  find: mocks.findDoc,
  remove: mocks.removeDoc,
}));
vi.mock("@/modules/work-sessions/repository", () => ({
  active: mocks.boardActive,
  history: mocks.boardHistory,
  start: mocks.start,
  listReports: mocks.listReports,
}));
vi.mock("@/modules/invitations/repository", () => ({
  findByHash: mocks.findInvitation,
  findById: mocks.findInvitation,
  claim: mocks.claimInvitation,
}));
import * as teams from "@/modules/teams/service";
import * as docs from "@/modules/documents/service";
import * as sessions from "@/modules/work-sessions/service";
import * as invitations from "@/modules/invitations/service";

const teamId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";
describe("aislamiento y permisos de equipos", () => {
  beforeEach(() => {
    mocks.membership.mockResolvedValue(undefined);
    mocks.boardActive.mockResolvedValue([]);
    mocks.boardHistory.mockResolvedValue([]);
    mocks.start.mockResolvedValue({});
    mocks.listReports.mockResolvedValue([]);
  });
  it("deniega datos y escrituras de equipo a un no miembro antes de consultar sus tablas", async () => {
    await expect(teams.requireMembership(teamId, userId)).rejects.toMatchObject(
      { status: 403 },
    );
    await expect(sessions.getBoard(teamId, userId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      sessions.startSession(
        { teamId, title: "header", description: "Fix", ganttTaskId: teamId },
        userId,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      docs.deleteDocument(teamId, "doc", userId),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.boardActive).not.toHaveBeenCalled();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.findDoc).not.toHaveBeenCalled();
  });
  it("un miembro no puede realizar acciones de owner", async () => {
    mocks.membership.mockResolvedValue({ role: "member", userId, teamId });
    await expect(teams.requireOwner(teamId, userId)).rejects.toMatchObject({
      status: 403,
    });
  });
  it("resolver un slug ajeno no carga los datos del equipo", async () => {
    mocks.findTeamId.mockResolvedValue({ id: teamId });
    await expect(
      teams.getTeamBySlug("otro-equipo", userId),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.findTeam).not.toHaveBeenCalled();
  });
  it("el owner solo puede salir cuando es el último miembro", async () => {
    mocks.membership.mockResolvedValue({ role: "owner", userId, teamId });
    mocks.teamMembers.mockResolvedValue([
      { role: "owner", userId },
      { role: "member", userId: "another" },
    ]);
    await expect(teams.leaveTeam(teamId, userId)).rejects.toThrow(
      "mientras haya otros miembros",
    );
    expect(mocks.leaveIfUnchanged).not.toHaveBeenCalled();
    mocks.teamMembers.mockResolvedValue([{ role: "owner", userId }]);
    mocks.leaveIfUnchanged.mockResolvedValue(true);
    await teams.leaveTeam(teamId, userId);
    expect(mocks.leaveIfUnchanged).toHaveBeenCalledWith(
      teamId,
      userId,
      [userId],
      true,
    );
  });
  it("solo el autor o el owner pueden borrar un documento", async () => {
    mocks.membership.mockResolvedValue({ role: "member" });
    mocks.findDoc.mockResolvedValue({ createdBy: "someone-else" });
    await expect(
      docs.deleteDocument(teamId, "doc", userId),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.removeDoc).not.toHaveBeenCalled();
    mocks.findDoc.mockResolvedValue({ createdBy: userId });
    await docs.deleteDocument(teamId, "doc", userId);
    expect(mocks.removeDoc).toHaveBeenCalledWith(teamId, "doc");
    mocks.membership.mockResolvedValue({ role: "owner" });
    mocks.findDoc.mockResolvedValue({ createdBy: "someone-else" });
    await expect(
      docs.deleteDocument(teamId, "doc", userId),
    ).resolves.toBeUndefined();
  });
  it("avisa por coincidencia de título sin impedir el inicio", async () => {
    mocks.membership.mockResolvedValue({ role: "member" });
    mocks.boardActive.mockResolvedValue([
      { userId: "someone-else", title: "HEADER" },
    ]);
    await expect(
      sessions.startSession(
        { teamId, title: "header", description: "Fix", ganttTaskId: teamId },
        userId,
      ),
    ).resolves.toEqual({ collision: true });
    expect(mocks.start).toHaveBeenCalledOnce();
  });
  it("no acepta invitaciones vencidas, de otro correo o sin verificación", async () => {
    const user = {
      id: userId,
      email: "a@example.test",
      emailVerifiedAt: new Date(),
    } as CurrentUser;
    mocks.findInvitation.mockResolvedValue({
      id: "inv",
      teamId,
      email: "b@example.test",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });
    await expect(
      invitations.acceptInvitation("inv", user),
    ).rejects.toMatchObject({ status: 403 });
    mocks.findInvitation.mockResolvedValue({
      id: "inv",
      teamId,
      email: user.email,
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      invitations.acceptInvitation("inv", user),
    ).rejects.toMatchObject({ status: 400 });
    mocks.findInvitation.mockResolvedValue({
      id: "inv",
      teamId,
      email: user.email,
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });
    await expect(
      invitations.acceptInvitation("inv", { ...user, emailVerifiedAt: null }),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.claimInvitation).not.toHaveBeenCalled();
  });
});
