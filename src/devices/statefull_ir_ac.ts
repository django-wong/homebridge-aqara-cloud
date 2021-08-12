import { ResourceMapping } from "../device";
import IRDevice from "./ir_device";
import AcState from '../lib/ac_state';
import { Characteristic } from "homebridge";

export default class StatefullIRAC extends IRDevice {
    protected acState!: AcState;

    async fetchRemoterKeys() {
        const response = await this.platform.aqaraApi.request<Intent['query']['ir']['acState']>(
            'query.ir.acState', {
                did: this.accessory.context.did
            }
        )

        if (response.data) {
            if (response.data.result.acState) {
                this.acState = new AcState(response.data.result.acState, this);
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

    private monitorAcState() {
        setInterval(() => this.fetchRemoterKeys(), 30 * 1000)
    }

    protected currentHeatingCoolingStateCharacteristic?: Characteristic;

    get abilities(): ResourceMapping[] {
        return [
            {
                service: this.Service.Thermostat,
                characteristics: [
                    {
                        characteristic: this.Characteristic.CurrentHeatingCoolingState,
                        resource: {
                            getter: () => {
                                this.platform.log.info('Get current heating cooling state...');
                                return this.acState.getCurrentHeatingCoolingState() ?? null;
                            },
                        },
                        onCreate: (characteristic) => this.currentHeatingCoolingStateCharacteristic = characteristic
                    },
                    {
                        characteristic: this.Characteristic.TargetHeatingCoolingState,
                        resource: {
                            getter: () => {
                                return this.acState.getTargetHeatingCoolingState() ?? null
                            },
                            setter: async (options) => {
                                this.acState.setTargetHeatingCoolingState(options.value as number);
                                await this.write();
                                this.currentHeatingCoolingStateCharacteristic?.updateValue(
                                    this.acState.getCurrentHeatingCoolingState() ?? null
                                )
                                return this.acState.getCurrentHeatingCoolingState() ?? options.value;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.CurrentTemperature,
                        resource: {
                            getter: () => {
                                // Note current temperature is not the ambient temperature but always same to target temperature
                                return this.acState.getCurrentTemperature() ?? null;
                            },
                        }
                    },
                    {
                        characteristic: this.Characteristic.TargetTemperature,
                        resource: {
                            getter: () => {
                                return this.acState.getTargetTemperature() ?? null;
                            },
                            setter: async (options) => {
                                this.acState.setTargetTemperature(options.value as number);
                                await this.write();
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
            },
            {
                service: this.Service.Fanv2,
                characteristics: [
                    {
                        characteristic: this.Characteristic.Active,
                        resource: {
                            getter: () => {
                                return this.acState.power ? this.Characteristic.Active.ACTIVE : this.Characteristic.Active.INACTIVE;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.SwingMode,
                        resource: {
                            getter: () => {
                                return this.acState.getSwingMode();
                            },
                            setter: (options) => {
                                this.acState.setSwingMode(options.value);
                                this.write();
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.RotationSpeed,
                        resource: {
                            getter: () => {
                                return this.acState.getFanSpeed();
                            },
                            setter: (options) => {
                                this.acState.setFanSpeed(options.value);
                                this.write();
                            }
                        }
                    }
                ]
            }
        ];
    }

    private async write() {
        const key = this.acState.toString();
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
