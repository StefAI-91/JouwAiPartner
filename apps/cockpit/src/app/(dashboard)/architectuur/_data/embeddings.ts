export const embedSection = {
  simpleExplanation:
    "Elke tekst (meeting-samenvatting, persoonsnaam, projectnaam) wordt omgezet in een lijst van 1024 getallen \u2014 een 'embedding'. Teksten die qua betekenis op elkaar lijken, hebben vergelijkbare getallen. Zo kan het systeem zoeken op betekenis in plaats van exacte woorden.",
  technicalDetails: [
    "Model: Cohere embed-v4.0 via v2 API (1024 dimensies, outputDimension parameter)",
    "inputType: 'search_document' voor opslag, 'search_query' voor zoekopdrachten",
    "Batch embedding: tot 96 teksten per API call",
    "Inline embedding: meeting + extracties worden direct na pipeline geembed",
    "Re-embed worker als fallback voor records met embedding_stale = true",
  ],
};
