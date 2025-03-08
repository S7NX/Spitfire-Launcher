export type ClientCredentials = {
  clientId: string;
  secret: string;
  base64: string;
}

export const fortniteAndroidGameClient: ClientCredentials = createClientCredentials({
  clientId: '3f69e56c7649492c8cc29f1af08a8a12',
  secret: 'b51ee9cb12234f50a69efa67ef53812e'
});

export const fortniteNewSwitchGameClient: ClientCredentials = createClientCredentials({
  clientId: '98f7e42c2e3a4f86a74eb43fbb41ed39',
  secret: '0a2449a2-001a-451e-afec-3e812901c4d7'
});

export const launcherAppClient2: ClientCredentials = createClientCredentials({
  clientId: '34a02cf8f4414e29b15921876da36f9a',
  secret: 'daafbccc737745039dffe53d94fc76cf'
});

export const defaultClient = fortniteAndroidGameClient;

function createClientCredentials({ clientId, secret }: Omit<ClientCredentials, 'base64'>): ClientCredentials {
  return {
    clientId,
    secret,
    base64: btoa(`${clientId}:${secret}`)
  };
}