import { ResourceMapping } from "../device";
import IRDevice from "./ir_device";

export default class IRTV extends IRDevice {
    protected active: number = this.Characteristic.Active.INACTIVE;

    async initState() {
        await super.initState();
    }

    get abilities(): ResourceMapping[] {
        return [
            // The main service
            {
                service: this.Service.Television,
                characteristics: [
                    {
                        characteristic: this.Characteristic.Active,
                        resource: {
                            getter: () => {
                                return this.active;
                            },
                            setter: async (options) => {
                                if (this.active != options.value) {
                                    this.active = options.value as number;
                                    await this.pressKeyByName('电源');
                                }
                                return this.active;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.SleepDiscoveryMode,
                        resource: {
                            getter: () => {
                                return this.Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.RemoteKey,
                        resource: {
                            setter: (options) => {
                                this.platform.log.debug(`press tv key ${options.value}`)
                                this.pressRemoteKey(options.value as number);
                                return options.value;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.ActiveIdentifier,
                        resource: {
                            getter() {
                                return 1;
                            },
                            setter(options) {
                                return options.value;
                            }
                        }
                    },
                    {
                        characteristic: this.Characteristic.ConfiguredName,
                        resource: {
                            getter: () => {
                                return this.accessory.context.deviceName;
                            },
                            setter(options) {
                                return options.value;
                            }
                        }
                    }
                ]
            },

            // TelevisionSpeaker
            {
                service: this.Service.TelevisionSpeaker,
                characteristics: [
                    {
                        characteristic: this.Characteristic.Mute,
                        resource: {
                            getter: () => this.active ? false : true,
                            setter: () => this.active ? false : true
                        }
                    },
                    {
                        characteristic: this.Characteristic.Active,
                        resource: {
                            getter: () => this.active,
                        }
                    },
                    {
                        characteristic: this.Characteristic.VolumeControlType,
                        resource: {
                            getter: () => this.Characteristic.VolumeControlType.ABSOLUTE
                        }
                    },
                    {
                        characteristic: this.Characteristic.VolumeSelector,
                        resource: {
                            setter: async (options) => {
                                switch (options.value) {
                                    case this.Characteristic.VolumeSelector.INCREMENT:
                                        await this.pressKeyByName('音量+');
                                        break;
                                    case this.Characteristic.VolumeSelector.DECREMENT:
                                        await this.pressKeyByName('音量-');
                                        break;
                                }
                                return options.value;
                            }
                        }
                    }
                ]
            }
        ];
    }

    async pressRemoteKey(key: number) {
        console.info(`Press the remote key<${key}>`);

        switch (key) {
            case this.Characteristic.RemoteKey.REWIND:
                this.platform.log.info('Not supported <rewind>');
                break;
            case this.Characteristic.RemoteKey.FAST_FORWARD:
                this.platform.log.info('Not supported <fast forward>');
                break;
            case this.Characteristic.RemoteKey.NEXT_TRACK:
                this.platform.log.info('Not supported <next track>');
                break;
            case this.Characteristic.RemoteKey.PREVIOUS_TRACK:
                this.platform.log.info('Not supported <previous track>');
                break;
            case this.Characteristic.RemoteKey.ARROW_UP:
                await this.pressKeyByName('上');
                break;
            case this.Characteristic.RemoteKey.ARROW_DOWN:
                await this.pressKeyByName('下');
                break;
            case this.Characteristic.RemoteKey.ARROW_LEFT:
                await this.pressKeyByName('左');
                break;
            case this.Characteristic.RemoteKey.ARROW_RIGHT:
                await this.pressKeyByName('右');
                break;
            case this.Characteristic.RemoteKey.SELECT:
                await this.pressKeyByName('设置');
                break;
            case this.Characteristic.RemoteKey.BACK:
                await this.pressKeyByName('返回');
                break;
            case this.Characteristic.RemoteKey.EXIT:
                this.platform.log.info('Not supported <exit>')
                break;
            case this.Characteristic.RemoteKey.PLAY_PAUSE:
                this.platform.log.info('Not supported <play/pause>')
                break;
            case this.Characteristic.RemoteKey.INFORMATION:
                await this.pressKeyByName('菜单');
                break;
        }
    }
}
