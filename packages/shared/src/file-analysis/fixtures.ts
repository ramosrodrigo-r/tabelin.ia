import type { UploadResponse } from "./schema";

export const FILE_ANALYSIS_FIXTURES: UploadResponse[] = [
  {
    type: "upload_complete",
    uploadedFileId: "clxfixture0000000000000001",
    schema: {
      fileName: "vendas.csv",
      rowCount: 5,
      sheetName: undefined,
      columns: [
        {
          name: "Produto",
          type: "texto",
          sampleValues: ["Notebook", "Mouse", "Teclado", "Monitor", "Headset"]
        },
        {
          name: "Quantidade",
          type: "numero",
          sampleValues: [2, 5, 3, 1, 4]
        },
        {
          name: "Data",
          type: "data",
          sampleValues: [
            "2024-01-15",
            "2024-01-16",
            "2024-01-17",
            "2024-01-18",
            "2024-01-19"
          ]
        }
      ],
      sampleRows: [
        { Produto: "Notebook", Quantidade: 2, Data: "2024-01-15" },
        { Produto: "Mouse", Quantidade: 5, Data: "2024-01-16" },
        { Produto: "Teclado", Quantidade: 3, Data: "2024-01-17" },
        { Produto: "Monitor", Quantidade: 1, Data: "2024-01-18" },
        { Produto: "Headset", Quantidade: 4, Data: "2024-01-19" }
      ]
    }
  }
];
