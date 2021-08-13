import { CharacteristicValueSetterOptions, ResourceMapping } from "../device";
import IRDevice from "./ir_device";
import AcState from '../lib/ac_state';
import { Characteristic } from "homebridge";
import { throttle } from "lodash";

export default class StatefullIRAC extends IRDevice {
    protected acState!: AcState;

    async fetchAcStatus() {
        const response = await this.platform.aqaraApi.request<Intent['query']['ir']['acState']>(
            'query.ir.acState', {
                did: this.accessory.context.did
            }
        )
        if (response.data) {
            this.acState = new AcState(
                response.data.result.acState ?? "", this
            );
        }
    }

    async initAcState() {
        try {
            await this.fetchAcStatus();
        } catch (e) {
            this.platform.log.error('fetch AC state failed');
            console.info(e && e.toString()); throw e;
        }
    }

    async initState() {
        await super.initState();
        if (this.irInfo?.type != 2) {
            throw new Error(
                `Invalid ir device type ${this.irInfo?.type}`
            );
        }
        await this.initAcState();
        this.monitorAcState();
    }

    protected acStateTimer?: NodeJS.Timer;

    private monitorAcState() {
        this.acStateTimer = setInterval(() => this.fetchAcStatus(), 30 * 1000)
    }

    dispose() {
        if (this.acStateTimer) {
            clearInterval(this.acStateTimer);
        }
        super.dispose();
    }

    protected currentHeatingCoolingStateCharacteristic?: Characteristic;

    get abilities(): ResourceMapping[] {
        return [
            {
                service: this.Service.HeaterCooler,
                characteristics: [
                    {
                        characteristic: this.Characteristic.Active,
                        resource: {
                            getter: () => this.acState.getActive(),
                            setter: async (options) => {
                                this.acState.setActive(options.value);
                                await this.write();
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.CurrentHeaterCoolerState,
                        resource: {
                            getter: () => {
                                return this.acState.getCurrentHeaterCoolerState();
                            },
                        },
                        onCreate: (characteristic) => {
                            this.currentHeatingCoolingStateCharacteristic = characteristic
                        }
                    },
                    {
                        characteristic: this.Characteristic.TargetHeaterCoolerState,
                        resource: {
                            getter: () => {
                                return this.acState.getTargetHeaterCoolerState()
                            },
                            setter: async (options) => {
                                this.acState.setTargetHeaterCoolerState(options.value);
                                await this.write();

                                this.currentHeatingCoolingStateCharacteristic?.updateValue(
                                    this.acState.getCurrentHeaterCoolerState()
                                )
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.CurrentTemperature,
                        resource: {
                            getter: () => {
                                return this.acState.getCurrentTemperature() ?? null;
                            },
                        }
                    },
                    {
                        characteristic: this.Characteristic.CoolingThresholdTemperature,
                        resource: {
                            getter: () => this.getThresholdTemperature(),
                            setter: (options) => {
                                return this.setThresholdTemperature(options)
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.HeatingThresholdTemperature,
                        resource: {
                            getter: () => this.getThresholdTemperature(),
                            setter: (options) => {
                                return this.setThresholdTemperature(options)
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.SwingMode,
                        resource: {
                            getter: () => {
                                return this.acState.getSwingMode();
                            },
                            setter: async (options) => {
                                this.acState.setSwingMode(options.value);
                                await this.write();
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.RotationSpeed,
                        resource: {
                            getter: () => {
                                return this.acState.getFanSpeed();
                            },
                            setter: throttle(async (options) => {
                                this.acState.setFanSpeed(options.value);
                                await this.write();
                            }, 300)
                        }
                    },
                    {
                        characteristic: this.Characteristic.TemperatureDisplayUnits,
                        resource: {
                            getter: () => this.Characteristic.TemperatureDisplayUnits.CELSIUS,
                            setter: () => this.Characteristic.TemperatureDisplayUnits.CELSIUS
                        }
                    },
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

    /**
     * Gets the threshold temperature.
     *
     */
    getThresholdTemperature() {
        return this.acState.getCurrentTemperature();
    }

    /**
     * Sets the threshold temperature.
     *
     * @param      {CharacteristicValueSetterOptions}  options  The options
     */
    async setThresholdTemperature(options: CharacteristicValueSetterOptions) {
        this.acState.setTargetTemperature(options.value as number);
        await this.write();
        return options.value;
    }
}
