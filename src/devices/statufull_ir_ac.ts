import { ResourceMapping } from "../device";
import IRDevice from "./ir_device";
import AcState from '../lib/ac_state';

export default class StatefullIRAC extends IRDevice {
    protected acState?: AcState;

    async fetchRemoterKeys() {
        const response = await this.platform.aqaraApi.request<Intent['query']['ir']['acState']>(
            'query.ir.acState', {
                did: this.accessory.context.did
            }
        )

        if (response.data) {
            if (response.data.result.acState) {
                this.acState = new AcState(response.data.result.acState);
                return;
            }
        }

        throw new Error('can not get ac state from remote');
    }

    async initState() {
        await super.initState();
        if (this.irInfo?.type == 2) {
            this.monitorAcState();
        } else {
            throw new Error(`Invalid ir device type ${this.irInfo?.type}`);
        }
    }

    monitorAcState() {
        setInterval(() => this.fetchRemoterKeys(), 30 * 1000)
    }

    get abilities(): ResourceMapping[] {
        return [
            {
                service: this.Service.Thermostat,
                characteristics: [
                    {
                        characteristic: this.Characteristic.CurrentHeatingCoolingState,
                        resource: {
                            getter: () => {
                                return this.acState?.getCurrentHeatingCoolingState() ?? null;
                            },
                        }
                    },
                    {
                        characteristic: this.Characteristic.TargetHeatingCoolingState,
                        resource: {
                            getter: () => {
                                return this.acState?.getTargetHeatingCoolingState() ?? null
                            },
                            setter: (options) => {
                                this.acState?.setTargetHeatingCoolingState(options.value as number);
                                this.write();
                                return options.value;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.CurrentTemperature,
                        resource: {
                            getter: () => {
                                return this.acState?.getCurrentTemperature() ?? null;
                            },
                        }
                    },
                    {
                        characteristic: this.Characteristic.TargetTemperature,
                        resource: {
                            getter: () => {
                                return this.acState?.getTargetTemperature() ?? null;
                            },
                            setter: (options) => {
                                this.acState?.setTargetTemperature(options.value as number);
                                this.write();
                                return options.value;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.TemperatureDisplayUnits,
                        resource: {
                            getter: () => this.Characteristic.TemperatureDisplayUnits.CELSIUS,
                            setter: () => {
                                return this.Characteristic.TemperatureDisplayUnits.CELSIUS;
                            }
                        }
                    }
                ]
            }
        ];
    }

    private async write() {
        const key = this.acState?.toString();
        if (key) {
            this.platform.log.info(`Press key<${key}>`);
            await this.platform.aqaraApi.request<Intent['write']['ir']['click']>(
                'write.ir.click', {
                    did: this.accessory.context.did, acKey: key
                }
            );
        }
    }
}
