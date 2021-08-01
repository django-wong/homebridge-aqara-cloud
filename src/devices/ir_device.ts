import Device, {ResourceMapping} from '../device';

type Key = Intent['query']['ir']['keys']['response']['keys'][0];

export default class IRDevice extends Device {
    protected irInfo?: Intent['query']['ir']['info']['response'];
    protected keys: Key[] = [];

    protected async readIrInfo() {
        const response = await this.platform.aqaraApi.request<Intent['query']['ir']['info']>(
            'query.ir.info', {
                did: this.accessory.context.did
            }
        );
        this.irInfo = response.data.result;
    }

    protected async fetchRemoterKeys() {
        const response = await this.platform.aqaraApi.request<Intent['query']['ir']['keys']>(
            'query.ir.keys', {
                did: this.accessory.context.did
            }
        );

        this.keys.push(...response.data.result.keys);
        this.platform.log.info(
            `${this.keys.length} keys detected.`
        )
    }

    async initState(): Promise<void> {
        try {
            await this.readIrInfo();

            // if (this.irInfo?.type == 2) {
                // await this.readControllerInfo();
            // } else {
                await this.fetchRemoterKeys();
            // }
        } catch (e) {
            this.platform.log.error('Error captured on init state');
            console.error(e);
        }
    }

    get abilities(): ResourceMapping[] {
        return this.keys.map((key) => {
            return {
                serviceName: key.keyName,
                serviceSubType: key.irKeyId,
                service: this.Service.Switch,
                characteristics: [
                    {
                        characteristic: this.Characteristic.On,
                        resource: {
                            getter: () => false,
                            setter: () => this.pressKey(key)
                        }
                    },
                    {
                        characteristic: this.Characteristic.Name,
                        resource: {
                            getter: () => key.keyName,
                            setter: () => this.pressKey(key)
                        }
                    }
                ]
            };
        });
    }

    async pressKey(key: Key) {
        this.platform.log.info(`Press key<${key.irKeyId}>`);
        const response = await this.platform.aqaraApi.request<Intent['write']['ir']['click']>(
            'write.ir.click', {
                did: this.accessory.context.did,
                controllerId: key.controllerId,
                keyId: key.keyId,
            }
        );
        return false;
    }
}
