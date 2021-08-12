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

    get manufacturer() {
        return this.irInfo?.brandName ?? super.manufacturer;
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
            await this.fetchRemoterKeys();
        } catch (e) {
            this.platform.log.error('Error captured on init state');
            console.error(e);
        }
    }

    dispose() {
        super.dispose();
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
                            setter: async () => {
                                await this.pressKey(key);
                                return false;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.Name,
                        resource: {
                            getter: () => key.keyName
                        }
                    }
                ]
            };
        });
    }

    async pressKeyByName(name: string) {
        const key = this.findKeyByName(name);
        if (key) {
            return await this.pressKey(key);
        }
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
    }

    findKeyByName(name: string): Key | undefined{
        return this.keys.find((item) => {
            return item.keyName == name;
        });
    }
}
