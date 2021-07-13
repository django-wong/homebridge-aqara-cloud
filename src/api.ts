import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createHash } from 'crypto';
import randomString from "crypto-random-string";

type PlainObject = {
	[key: string]: any
}

type ApiResponse<T = PlainObject> = {
	code: number		// int		是	返回错误码，0：成功，其他错误码请参考错误码说明
	requestId: string	// String	是	请求id
	message: string		// String	是	返回码描述
	result: T			// Object	否	接口返回数据，详见各接口说明
}

export default class Api {
	static intents = [
		'config.auth.createAccount', //	创建虚拟账号
		'config.auth.getAuthCode', //	获取授权验证码
		'config.auth.getToken', //	获取访问令牌
		'config.auth.refreshToken', //	刷新访问令牌
		'query.device.bindKey', //	获取设备入网bindKey
		'query.device.bind', //	查询设备绑定进度
		'query.device.info', //	查询设备信息
		'query.device.subInfo', //	查看网关下子设备信息
		'config.device.name', //	配置设备名称
		'write.device.openConnect', //	网关开启子设备入网模式指令
		'write.device.closeConnect', //	网关关闭子设备入网模式指令
		'query.device.supportGateway', //	查询支持子设备入网的网关列表
		'query.position.supportGateway', //	通过位置查询支持子设备入网的网关列表
		'write.device.unbind', //	下发解绑指令
		'query.resource.value', //	查询资源信息
		'fetch.resource.history', //	查询设备资源的历史数据
		'fetch.resource.statistics', //	查询设备资源的统计数据
		'write.resource.device', //	控制设备
		'config.resource.subscribe', //	订阅资源
		'config.resource.unsubscribe', //	取消订阅资源
		'query.position.info', //	查询位置信息
		'config.position.create', //	创建位置
		'config.position.delete', //	删除位置
		'config.position.update', //	更新位置
		'config.position.timeZone', //	修改位置时区
		'query.linkage.listBySubjectId', //	通过对象id查询联动
		'query.linkage.listByPositionId', //	通过位置分页查询联动
		'query.ifttt.trigger', //	查询指定对象类型下触发器
		'query.ifttt.action', //	查询指定对象类型下执行器
		'config.linkage.create', //	创建联动
		'query.linkage.detail', //	查询联动详情
		'config.linkage.update', //	修改联动信息
		'config.linkage.delete', //	删除联动
		'config.linkage.enable', //	打开/关闭联动
		'query.event.listByPositionId', //	查询条件集列表
		'query.event.detail', //	查询条件集详情
		'config.event.create', //	创建条件集
		'config.event.update', //	更新条件集
		'config.event.delete', //	删除条件集
		'query.scene.listBySubjectId', //	通过对象id查询场景
		'query.scene.listByPositionId', //	通过位置分页查询场景
		'query.scene.detail', //	查询场景详情
		'config.scene.create', //	创建场景
		'config.scene.update', //	修改场景信息
		'config.scene.delete', //	删除场景
		'config.scene.run', //	执行场景
		'config.scene.try', //	试一下场景
		'query.ota.firmware', //	查询固件
		'query.ota.upgrade', //	查询固件升级状态
		'write.ota.upgrade', //	升级固件
		'query.ir.match', //	查询匹配树信息
		'query.ir.categories', //	查询设备类型列表
		'query.ir.brands', //	通过设备类型获取品牌列表
		'query.ir.info', //	查询遥控器信息
		'query.ir.list', //	查询网关下遥控器列表
		'query.ir.acState', //	查询有状态空调状态
		'query.ir.functions', //	查询遥控器功能
		'query.ir.keys', //	查询遥控器按键
		'config.ir.create', //	增加遥控器
		'config.ir.delete', //	删除遥控器
		'config.ir.update', //	更新遥控器
		'config.ir.custom', //	增加自定义遥控器
		'write.ir.click', //	单击遥控器按键
		'write.ir.startLearn', //	开启红外学习
		'write.ir.cancelLearn', //	取消开启红外学习
		'query.ir.learnResult', //	查询红外学习结果
	]

	protected httpClient: AxiosInstance;

	constructor(
		protected readonly accessToken: string,
		protected readonly appId: string,
		protected readonly keyId: string,
		protected readonly appKey: string,
		public lang = 'zh',
		public readonly domain = 'https://open-cn.aqara.com/v3.0/open/api'
	) {
		this.httpClient = axios.create({
			baseURL: this.domain,
			method: 'get'
		});
	}

	protected nonceNumber = 1;

	get nonce() {
		return randomString(10);
	}

	get timestamp() {
		return Math.round(Date.now());
	}

	createHeader() {
		const nonce = this.nonce;
		const timestamp = this.timestamp;
		const sign = createHash('md5').update(
			`Accesstoken=${this.accessToken}&Appid=${this.appId}&Keyid=${this.keyId}&Nonce=${nonce}&Time=${timestamp}${this.appKey}`.toLowerCase()
		).digest('hex');
		const headers = {
			Accesstoken: this.accessToken,
			Appid: this.appId,
			Keyid: this.keyId,
			Nonce: nonce,
			Time: timestamp,
			Sign: sign,
			Lang: this.lang
		}
		console.info(headers);
		return headers;
	}

	request<R = any, T = ApiResponse<R>>(intent: string, data: PlainObject, options?: PlainObject): Promise<AxiosResponse<T>> {
		if (!Api.intents.includes(intent)) {
			throw Error(`unrecognizable intent: ${intent}`);
		}

		return this.httpClient.request<T>({
			headers: this.createHeader(),
			method: 'post',
			data: {
				intent: intent,
				data,
				...options
			}
		})
	}
}
