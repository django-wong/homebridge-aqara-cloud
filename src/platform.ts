import { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, UnknownContext } from "homebridge";
import Api from "./api";
import Device, { AqaraAccessory, SubClassOfDevice } from "./device";
import AirConditioner from './devices/air_conditioner';

export default class AqaraCloudPlatform implements DynamicPlatformPlugin {
	static pluginIdentifier = 'homebridge-aqara-cloud';
	static platformName = 'Aqara Cloud';

	/**
	 * Device category and model mapping. Use to find the proper device driver when creating accessories
	 */
	static readonly DeviceCategories: [SubClassOfDevice, string[]][] = [
		[AirConditioner, ['lumi.aircondition.acn05']]
	]

	/**
	 * Cached accessories
	 */
	// private readonly cachedAccessories: PlatformAccessory<AqaraAccessory>[] = [];

	private aqaraAccessories: Device[] = [];

	/**
	 * Aqara API helper
	 */
	public readonly aqaraApi: Api;

	/**
	 * Alias to api.hap.Characteristic
	 *
	 * @type       {Characteristic}
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
	constructor(
		public readonly log: Logger,
		public readonly config: PlatformConfig,
		public readonly api: API
	) {
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
        // this.cachedAccessories.push(accessory);
        this.registerDevice(accessory);
    }

    /**
     * Discover new devices and remove devices that no longer exists on aqara cloud
     *
     * @return     {Promise}
     */
    async discoverDevices() {
    	const data: Intent['query']['device']['info']['request'] = {
    		pageSize: 100
    	};

    	const response = await this.aqaraApi.request<Intent['query']['device']['info']['response']>('query.device.info', data);

    	this.aqaraAccessories = this.aqaraAccessories.filter((accessory) => {
    		const exists = response.data.result.data.find((item) => {
    			return item.did == accessory.accessory.context.did;
			});
    		return exists != null;
		});

    	const newAccessories = response.data.result.data.filter((item) => {
    		const exists = this.aqaraAccessories.find((device) => {
    			return device.accessory.context.did == item.did;
			});
    		return exists == undefined;
		}).map((item) => {
			const uuid = this.api.hap.uuid.generate(item.did);
			let accessory = new this.api.platformAccessory<AqaraAccessory>(item.deviceName, uuid);
			accessory.context = item;
			return this.registerDevice(accessory);
		}).filter((device) => {
			return device != undefined;

		}).map((device) => {
			return device!.accessory;
		});

		this.api.registerPlatformAccessories(
			AqaraCloudPlatform.pluginIdentifier, AqaraCloudPlatform.platformName, newAccessories
		);
    }

	/**
	 * Create device instance from accessor
	 * @param accessory
	 */
	registerDevice(accessory: PlatformAccessory<AqaraAccessory>) {
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
