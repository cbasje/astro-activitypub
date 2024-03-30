import * as crypto from "node:crypto";

// Adapted from https://github.com/michaelcpuckett/activity-kit/tree/master/packages/crypto-node

export async function generateKeyPair(): Promise<{
	privateKey: string;
	publicKey: string;
}> {
	return await new Promise((resolve, reject) => {
		const options: crypto.RSAKeyPairOptions<"pem", "pem"> = {
			modulusLength: 2048, // 4096,
			publicKeyEncoding: {
				type: "pkcs1",
				format: "pem",
			},
			privateKeyEncoding: {
				type: "pkcs8",
				format: "pem",
			},
		};
		crypto.generateKeyPair(
			"rsa",
			options,
			(error: Error | null, publicKey: string, privateKey: string) => {
				if (error) {
					reject(error);
				} else {
					resolve({
						publicKey,
						privateKey,
					});
				}
			}
		);
	});
}

export async function randomBytes(numberOfBytes: number): Promise<string> {
	return await new Promise((resolve, reject) => {
		crypto.randomBytes(numberOfBytes, (error: unknown, buffer: Buffer) => {
			if (error) {
				reject(error);
			}

			resolve(buffer.toString("hex"));
		});
	});
}

export async function getHttpSignature(
	foreignTarget: URL,
	actorId: URL,
	privateKey: string,
	entity?: Record<string, unknown>
): Promise<{
	dateHeader: string;
	digestHeader?: string;
	signatureHeader: string;
}> {
	const foreignDomain = foreignTarget.hostname;
	const foreignPathName = foreignTarget.pathname;
	const dateString = new Date().toUTCString();
	const signer = crypto.createSign("sha256");

	if (entity) {
		const digestHash = crypto
			.createHash("sha256")
			.update(JSON.stringify(entity))
			.digest("base64");
		const digestHeader = `SHA-256=${digestHash}`;
		const stringToSign = `(request-target): post ${foreignPathName}\nhost: ${foreignDomain}\ndate: ${dateString}\ndigest: SHA-256=${digestHash}`;
		signer.update(stringToSign);
		signer.end();
		const signature = signer.sign(privateKey);
		const signature_b64 = signature.toString("base64");
		const signatureHeader = `keyId="${actorId.toString()}#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${signature_b64}"`;

		return {
			dateHeader: dateString,
			digestHeader,
			signatureHeader,
		};
	} else {
		const stringToSign = `(request-target): get ${foreignPathName}\nhost: ${foreignDomain}\ndate: ${dateString}`;
		signer.update(stringToSign);
		signer.end();
		const signature = signer.sign(privateKey);
		const signature_b64 = signature.toString("base64");
		const signatureHeader = `keyId="${actorId.toString()}#main-key",algorithm="rsa-sha256",headers="(request-target) host date",signature="${signature_b64}"`;

		return {
			dateHeader: dateString,
			signatureHeader,
		};
	}
}
