import { EntityPage } from "../../shared/EntityPage";

type Area = { code: string; name: string; purpose?: string; is_active: boolean };

export function AreasPage() {
  return (
    <EntityPage<Area>
      title="Áreas de la empresa"
      subtitle="Unidades internas que piden y atienden trabajo · no son clientes de venta"
      endpoint="/areas"
      columns={[
        { key: "code", label: "Código" },
        { key: "name", label: "Área" },
        { key: "purpose", label: "Para qué existe" },
      ]}
    />
  );
}
