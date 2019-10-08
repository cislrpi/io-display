export interface ResponseContent {
  details: {
    viewId: string;
    closedDisplayContextName: string;
    lastDisplayContext: string;
    [key: string]: string;
  };
}
