import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from "homebridge";
import Api from "./api";
import Device, { AqaraAccessory, SubClassOfDevice } from "./device";


import StatefullIRAC from './devices/statefull_ir_ac';
import IRTV from './devices/ir_tv';
import IRFan from "./devices/ir_fan";
import TemperatureSensor from "./devices/temperature_sensor";

const IDENTIFIER = 'homebridge-aqara-cloud';
const PLATFORM_NAME = 'Aqara Cloud';

export default class AqaraCloudPlatform implements DynamicPlatformPlugin {
    static pluginIdentifier = IDENTIFIER;
    static platformName = PLATFORM_NAME;

    /**
     * Device category and model mapping. Use to find the proper device driver when creating accessories
     */
    static readonly DeviceCategories: [SubClassOfDevice, string[]][] = [
        [TemperatureSensor, ['lumi.aircondition.acn05']],
        [IRTV, ['virtual.ir.tv']],
        [StatefullIRAC, ['virtual.ir.ac']],
        [IRFan, ['virtual.ir.fan']],
    ]

    private aqaraDevices: Device[] = [];

    /**`
     * Aqara API helper
     */
    public readonly aqaraApi: Api;

    /**
     * Constructs a new instance.
     *
     * @param log
     * @param config
     * @param api
     */
    constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
        this.api.on('didFinishLaunching', () => {
            this.discoverDevices();
            setInterval(() => this.discoverDevices(), 60 * 1000 * 15)
        });
        // Create the API request kit
        this.aqaraApi = new Api(
            config.accessToken, config.appId, config.keyId, config.appKey
        )
    }

    /**
     * Discover new devices and remove devices that no longer exists on aqara cloud
     */
    async discoverDevices() {
        this.log.info("Discovering devices....");
        const response = await this.aqaraApi.request<Intent['query']['device']['info']>(
            'query.device.info', {
                pageSize: 100
            }
        );

        const dids: string[] = [];

        response.data.result.data.forEach(
            (item) => {
                dids.push(item.did);
                this.registerNewDevice(item);
            }
        )

        this.aqaraDevices = this.aqaraDevices.filter(
            (accessory) => this.filterDevices(dids, accessory)
        );
    }

    /**
     * { function_description }
     *
     * @param      {string[]}  dids    The dids
     * @param      {Device}    device  The device
     */
    private filterDevices(dids: string[], device: Device) {
        const exists = dids.find((item) => {
            return item == device.accessory.context.did;
        });

        if (exists != undefined) {
            return true;
        }

        device.dispose();

        this.api.unregisterPlatformAccessories(
            IDENTIFIER, PLATFORM_NAME, [device.accessory]
        );

        return false;
    }

    /**
     * Register new device
     *
     * @param      {Intent['query']['device']['info']['response']['data'][0]}  item    The item
     */
    private registerNewDevice(item: Intent['query']['device']['info']['response']['data'][0]) {
        if (this.findRegistedAccessoryByID(item.did)) {
            return;
        }

        const uuid = this.api.hap.uuid.generate(item.did);

        const accessory = new this.api.platformAccessory<AqaraAccessory>(
            item.deviceName, uuid
        );
        accessory.context = item;

        const device = this.bootAccessory(accessory);
        if (!device) {
            this.log.info(`Unsupported device model: ${item.model}`)
            return;
        }

        this.api.registerPlatformAccessories(
            IDENTIFIER, PLATFORM_NAME, [device.accessory]
        );
    }

    /**
     * Finds a registed accessory by id.
     *
     * @param      {string}  did     The did
     */
    private findRegistedAccessoryByID(did: string) {
        return this.aqaraDevices.find((device) => {
            return device.accessory.context.did == did;
        });
    }

    /**
     * Create device instance from accessor
     *
     * @param accessory
     */
    private bootAccessory(accessory: PlatformAccessory<AqaraAccessory>): Device | undefined {
        const Driver = this.findDriverByAccessory(accessory);

        if (!Driver) {
            return;
        }

        this.log.info(
            `Create new aqara device ${accessory.context.did} ${accessory.context.model}`
        );

        const instance = new Driver(this, accessory);

        this.aqaraDevices.push(instance);

        return instance;
    }

    /**
     * Finds a driver by model.
     *
     * @param      {string}  model   The model
     */
    private findDriverByModel(model: string) {
        const configuration = AqaraCloudPlatform.DeviceCategories.find((category) => {
            const [, modes] = category;
            return modes.includes(model);
        });

        return configuration ? configuration[0] : null;
    }

    /**
     * Finds a driver by accessory.
     *
     * @param      {PlatformAccessory<AqaraAccessory>}  accessory  The accessory
     */
    private findDriverByAccessory(accessory: PlatformAccessory<AqaraAccessory>) {
        return this.findDriverByModel(
            accessory.context.model
        );
    }

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
     * On configure accessory
     *
     * @param      {PlatformAccessory<UnknownContext>}  accessory  The accessory
     */
    configureAccessory(accessory: PlatformAccessory<AqaraAccessory>): void {
        this.bootAccessory(accessory);
        this.log.info(
            `Restore accessory ${accessory.context.deviceName} from cache.`
        );
    }
}
