import Api from "../src/api";

const {
    ACCESS_TOKEN, APP_ID, APP_KEY_ID, APP_KEY_SECRET
} = process.env;

const api = new Api(ACCESS_TOKEN!, APP_ID!, APP_KEY_ID!, APP_KEY_SECRET!);

test('api instance can be created', () => {
    expect(api).toBeInstanceOf(Api);
})


test('access token is correct', async () => {
    const response = await api.request('query.device.info', {});
    expect(response.data.result).toBeTruthy();
})
