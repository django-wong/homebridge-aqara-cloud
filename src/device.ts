import { Characteristic, CharacteristicChange, CharacteristicValue, Nullable, PlatformAccessory, Service, WithUUID } from 'homebridge';

import { uniq } from 'lodash';

import AqaraCloudPlatform from './platform';

type PromiseOr<T> = Promise<T> | T;

type CharacteristicGetResult = PromiseOr<Nullable<CharacteristicValue>>

type CharacteristicSetResult = PromiseOr<[Nullable<CharacteristicValue>, string]>

type CharacteristicValueGetter = (value: Nullable<string>, context: any, connection: HAPConnection, resourceId: string) => CharacteristicGetResult

type CharacteristicValueSetter = (value: CharacteristicValue, context: any, connection: HAPConnection, resourceId: string) => CharacteristicSetResult

type CharacteristicAndResourceMapping = {
	characteristic: WithUUID<{new (): Characteristic}>,
	resource: {
		id: string,
		getter?: CharacteristicValueGetter
		setter?: CharacteristicValueSetter
	}
}

export type ResourceMapping = {
	service: WithUUID<typeof Service>,
	characteristics: CharacteristicAndResourceMapping[]
}

type HAPConnection = CharacteristicChange['originator'];

export type AqaraAccessory = Intent['query']['device']['info']['response']['data'][0];
export type ResourcesValue = Intent['query']['resource']['value']['response'];

export type SubClassOfDevice = new (platform: AqaraCloudPlatform, accessory: PlatformAccessory<AqaraAccessory>) => Device
/**
 * The abstraction of a device. You should use other type of devices instead of this one.
 *
 * @class      Device (name)
 */
export default abstract class Device {
	constructor(public platform: AqaraCloudPlatform, public accessory: PlatformAccessory<AqaraAccessory>) {
		this.init().then(() => {
			setInterval(() => {
				this.pull().then(() => {
					console.info(`Refresh state of device<${this.accessory.context.did}>`);
				})
			}, 30000);
		});
	}

	async init() {
		// this.registerAccessoryInformation();
		this.registerServices();
	}

	/**
	 * Alias to api.hap.Characteristic
	 */
	get Characteristic() {
		return this.platform.Characteristic;
	}

	/**
	 * Alias to api.hap.Service
	 */
	get Service() {
		return this.platform.Service;
	}

	protected get now() {
		return Date.now();
	}

	get manufacturer(): string {
		return 'Aqara';
	}

	get model(): string {
		return this.accessory.context.model;
	}

	get serialNumber(): string {
		return this.accessory.context.did;
	}

	public resoucesValue: ResourcesValue = [];

	/**
	 * Check requested resource is supported by the plugin
	 *
	 * @param      {string[]}  resourcesId  The resources identifier
	 */
	// private checkIfSupported(resourcesId: string[]) {
	// 	const unsupportedResources = difference(resourcesId, this.availableResourcesID);
	// 	if (unsupportedResources.length > 0) {
	// 		throw new Error(
	// 			`unsupported resources specified: ${unsupportedResources.join(', ')}`
	// 		);
	// 	}
	// }


	// private registerAccessoryInformation() {
	// 	this.accessory.getService(this.Service.AccessoryInformation)?.setCharacteristic(
	// 		this.Characteristic.Manufacturer, this.getManufacturer()
	// 	)?.setCharacteristic(
	// 		this.Characteristic.Model, this.getModel()
	// 	)?.setCharacteristic(
	// 		this.Characteristic.SerialNumber, this.getSerialNumber()
	// 	)
	// }

	/**
	 * This method will be called to register this device in homebridge
	 */
	private registerServices() {
		const abilities = this.abilities;
		abilities.forEach((ability) => {
			const service = this.createService(ability.service);
			ability.characteristics.forEach((characteristic) => {
				service != undefined && this.createCharacteristic(service, characteristic);
			});
		});
	}

	/**
	 * Creates a service.
	 *
	 * @param      {WithUUID<typeof Service>}  service  The service
	 */
	private createService(service: WithUUID<typeof Service>) {
		return this.accessory.getService(service);
	}

	/**
	 * Creates a characteristic.
	 *
	 * @param      {Service}                           service  The service
	 * @param      {CharacteristicAndResourceMapping}  options  The options
	 */
	private createCharacteristic(service: Service, options: CharacteristicAndResourceMapping) {
		const characteristic = service.getCharacteristic(options.characteristic)

		// Bind the getter to characteristic
		if (typeof options.resource.getter == "function") {
			characteristic.onGet(async (context, connection?: HAPConnection) => {
				let value = await this.readResourceValue(options.resource.id);
				// @ts-ignore
				return options.resource.getter(
					value, context, connection, options.resource.id
				);
			})
		}

		// Bind the setter to characteristic
		if (typeof options.resource.setter == 'function') {
			characteristic.onSet(async (value: CharacteristicValue, context: any, connection?: HAPConnection) => {
				// @ts-ignore
				const [res1, res2] = await options.resource.setter(value, context, connection, options.resource.id);
				await this.setResource(options.resource.id, res2)
				return res1;
			});
		}
	}

	/**
	 * Define the abilities of the accessory
	 *
	 * @type       {ResourceMapping[]}
	 */
	get abilities(): ResourceMapping[] {
		return [
		];
	}

	/**
	 * Gets the service and characteristics. You may override this method to create new device type.
	 *
	 * @return     {[Service, Characteristic[]][]}  The service and characteristics.
	 */
	getServiceAndCharacteristics(): [typeof Service, typeof Characteristic[]][] {
		return [
			[this.Service.AccessoryInformation, [this.Characteristic.Identifier]]
		];
	}

	/**
	 * Get all registered resource id
	 *
	 * @type       {string[]}
	 */
	get availableResourcesID(): string[] {
		const resourcesId = this.abilities.map<string[]>((service) => {
			return service.characteristics.map((characteristic) => characteristic.resource.id);
		}).reduce((res, resources) => {
			res.push(...resources);
			return res;
		}, []);

		return uniq(resourcesId);
	}


	/**
	 * Pulls the resources value from aqara cloud and cache it before next pull.
	 */
	private async pull(){
		const response = await this.platform.aqaraApi.request<Intent['query']['resource']['value']['response']>("query.resource.value", {
			"resources": [
				{
					"subjectId": "virtual2.11774113824794",
					"resourceIds": this.availableResourcesID
				}
			]
		});
		if (Array.isArray(response.data.result)) {
			this.resoucesValue = response.data.result;
		}
	}

	findResource(resourceId: string) {
		return this.resoucesValue.find((resource) => resource.resourceId = resourceId);
	}

	/**
	 * Reads a resource value from cached state or pull from aqara cloud at the time of read.
	 *
	 * @param      {string}                  resourceId  The resource identifier
	 * @return     {(Promise<string|null>)}
	 */
	async readResourceValue(resourceId: string): Promise<string | null> {
		if (this.resoucesValue.length == 0) {
			await this.pull();
		}

		let resource = this.findResource(resourceId);

		if (resource != undefined) {
			if (this.now - resource?.timeStamp < 3000) {
				return resource?.value;
			}
		}

		return null;
	}

	/**
	 * Set resource value by write to Aqara cloud
	 *
	 * @param resourceId
	 * @param value
	 */
	async setResource(resourceId: string, value: string) {
		await this.platform.aqaraApi.request<Intent['write']['resource']['device']['response']>(
			'write.resource.device', [{
			subjectId: this.accessory.context.did,
			resources: [
				{
					resourceId, value
				}
			]
		}]);
		await this.pull();
	}
}
