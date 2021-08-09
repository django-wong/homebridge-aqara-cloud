import { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from "homebridge";
import Api from "./api";
import Device, { AqaraAccessory, SubClassOfDevice } from "./device";
// import AirConditionerController from "./devices/air_conditioner_controller";
import IRDevice from "./devices/ir_device";
import StatefullIRAC from './devices/statufull_ir_ac';
import IRTV from './devices/ir_tv';
import IRFan from "./devices/ir_fan";


export default class AqaraCloudPlatform implements DynamicPlatformPlugin {
    static pluginIdentifier = 'homebridge-aqara-cloud';
    static platformName = 'Aqara Cloud';

    /**
     * Device category and model mapping. Use to find the proper device driver when creating accessories
     */
    static readonly DeviceCategories: [SubClassOfDevice, string[]][] = [
        [
            IRTV, [
                'virtual.ir.tv'
            ]
        ],
        [
            StatefullIRAC, [
                'virtual.ir.ac'
            ]
        ],
        [
            IRFan, [
                'virtual.ir.fan'
            ]
        ],
        [
            IRDevice, [
                'virtual.ir.default'
            ]
        ]
    ]

    /**
     * Cached accessories
     */
    // private readonly cachedAccessories: PlatformAccessory<AqaraAccessory>[] = [];

    private aqaraAccessories: Device[] = [];

    /**`
     * Aqara API helper
     */
    public readonly aqaraApi: Api;

    /**
     * Alias to api.hap.Characteristic
     */
    get Characteristic() {
        return this.api.hap.Characteristic;
    }

    /**
     * Alias to api.hap.Service
     *
     * @type       {Service}
     */
    get Service() {
        return this.api.hap.Service;
    }

    /**
     * Constructs a new instance.
     *
     * @param log
     * @param config
     * @param api
     */
    constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
        this.api.on('didFinishLaunching', () => {
            setInterval(() => {
                this.discoverDevices();
            }, 30000)
        });
        this.aqaraApi = new Api(
            config.accessToken, config.appId, config.keyId, config.appKey
        )
    }

    /**
     * On configure accessory
     *
     * @param      {PlatformAccessory<UnknownContext>}  accessory  The accessory
     */
    configureAccessory(accessory: PlatformAccessory<AqaraAccessory>): void {
        this.log.info(`Restore accessory ${accessory.context.deviceName} from cache.`);
        this.registerDevice(accessory);
    }

    /**
     * Discover new devices and remove devices that no longer exists on aqara cloud
     *
     * @return     {Promise}
     */
    async discoverDevices() {
        this.log.info("Discovering devices....");
        const data: Intent['query']['device']['info']['request'] = {
            pageSize: 100
        };

        const response = await this.aqaraApi.request<Intent['query']['device']['info']>('query.device.info', data);

        this.aqaraAccessories = this.aqaraAccessories.filter((accessory) => {
            const exists = response.data.result.data.find((item) => {
                return item.did == accessory.accessory.context.did;
            });
            if (exists != undefined) {
                return true;
            }

            this.api.unregisterPlatformAccessories(
                AqaraCloudPlatform.pluginIdentifier, AqaraCloudPlatform.platformName, [accessory.accessory]
            );

            return false;
        });

        const newAccessories = response.data.result.data.filter((item) => {
            // Filter accessories that is online (state = 1) and new
            const exists = this.aqaraAccessories.find((device) => {
                return device.accessory.context.did == item.did;
            });
            return exists == undefined && item.state == 1;

        }).map((item) => {
            // Register the device if supported
            const uuid = this.api.hap.uuid.generate(item.did);
            const accessory = new this.api.platformAccessory<AqaraAccessory>(item.deviceName, uuid);
            accessory.context = item;
            return this.registerDevice(accessory);

        }).filter((device) => {
            return device != undefined;

        }).map((device) => device!.accessory);

        if (newAccessories.length > 0) {
            this.log.info(`Registering ${newAccessories.length} new accessories`)
        }

        this.api.registerPlatformAccessories(
            AqaraCloudPlatform.pluginIdentifier, AqaraCloudPlatform.platformName, newAccessories
        );
    }

    /**
     * Create device instance from accessor
     * @param accessory
     */
    registerDevice(accessory: PlatformAccessory<AqaraAccessory>):Device | undefined {
        const configuration = AqaraCloudPlatform.DeviceCategories.find((category) => {
            const [, modes] = category;
            return modes.includes(accessory.context.model);
        });

        if (configuration == undefined) {
            return;
        }

        const instance = new configuration[0](this, accessory);

        this.aqaraAccessories.push(instance);

        return instance;
    }
}
