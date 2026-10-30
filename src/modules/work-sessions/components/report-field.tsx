export function ReportField({ required = false }: { required?: boolean }) {
  return (
    <label>
      Resúmenes de cambios .md
      <input
        type="file"
        name="report"
        accept=".md,text/markdown"
        required={required}
        multiple
      />
      <span className="field-hint">
        Adjuntá un archivo Markdown explicando los cambios realizados durante
        esta sesión. Solo .md en UTF-8, hasta 256 KB por archivo y 3 archivos
        por carga.
      </span>
    </label>
  );
}
