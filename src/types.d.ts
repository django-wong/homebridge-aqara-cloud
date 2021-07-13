interface Intent {
	query: {
		device: {
			info: {
				request: {
					"dids"?: string[]
					"positionId"?: string
					"pageNum"?: number
					"pageSize"?: number
				}
				response: {
					data: Array<{
						"parentDid": string
						"positionId": string
						"createTime": number // 1615899097028
						"timeZone": string // "GMT+09:00"
						"model": string // "lumi.gateway.aqhm01"
						"updateTime": number // 1615899097028
						"modelType": 1 | 2 | 3 // 1：可挂子设备的网关；2：不可挂子设备的网关；3：子设备
						"state": 1 | 0 // 在线状态：0-离线 1-离线
						"firmwareVersion": string // "3.2.6"
						"deviceName": string // "Aqara Hub"
						"did": string // "lumi.07737309957642"
					}>
				}
			}
		}
		resource: {
			value: {
				request: {
					'subjectId': string
					'resourceIds': string[]
				},
				response: Array<{
					"timeStamp": number
					"resourceId": string
					"value": string
					"subjectId": string
				}>
			}
		},
		ir: {
			info: {
				request: {
					"did": string
				}
				response: {
					"brandName": string
					"lineupId": string
					"controllerId": string | null
					"createTime": number
					"brandId": number
					"updateTime": number
					"type": 0 | 1 | 2
					"did": string
					"categoryId": number
				}
			},
			keys: {
				request: {
					"did": string
				}
				response: {
					"keys": Array<{
						"controllerId": number
						"irKeyId": string
						"keyName": string,
						"keyId": string
					}>,
					"type": number
				}
			}
		}
	},
	write: {
		resource: {
			device: {
				request: Array<{
					"subjectId": string
					"resources": Array<{
						"resourceId": string
						"value": string
					}>
				}>
				response: Array<{
					"subjectId": string
					"resources": Array<{
						"resourceId": string
						"value": string
					}>
				}>
			}
		}
	}
}
