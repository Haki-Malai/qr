declare module 'success-motivational-quotes' {
  export type Quote = { body: string; by: string };

  const quotesLib: {
    getAllQuotes(): Quote[];
  };

  export default quotesLib;
}

declare module 'string-hash' {
  export default function stringHash(input: string): number;
}
