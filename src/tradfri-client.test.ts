// tslint:disable:no-unused-expression
// tslint:disable:variable-name

import { assert, expect, should, use } from "chai";
import { CoapClient as coap, CoapResponse } from "node-coap-client";
import { spy, stub } from "sinon";
import "./"; // dummy-import so index.ts is covered
import { TradfriClient } from "./tradfri-client";

import { ContentFormats } from "node-coap-client/build/ContentFormats";
import { MessageCode } from "node-coap-client/build/Message";
import * as sinonChai from "sinon-chai";
import { Accessory } from "./lib/accessory";
import { DictionaryLike } from "./lib/object-polyfill";

// enable the should interface with sinon
should();
use(sinonChai);

describe("tradfri-client => ", () => {

	const tradfri = new TradfriClient("localhost");

	const devicesUrl = `coaps://localhost:5684/15001`;

	const fakeCoap: DictionaryLike<sinon.SinonStub> = {
		observe: null,
		request: null,
		stopObserving: null,
		reset: null,
	};
	let observeDevices_callback: (response: CoapResponse) => Promise<void>;
	const observeDevice_callbacks: DictionaryLike<(response: CoapResponse) => Promise<void>> = {};
	const emptyAccessory = new Accessory().serialize();
	/**
	 * Remembers a callback for later tests
	 */
	function rememberCallback(path: string, cb) {
		if (path === devicesUrl) {
			observeDevices_callback = cb;
		} else if (path.indexOf(devicesUrl) > -1) {
			const instanceId = path.substr(path.lastIndexOf("/") + 1);
			observeDevice_callbacks[instanceId] = cb;
		}
	}

	function createResponse(json: string | any): CoapResponse {
		if (typeof json !== "string") json = JSON.stringify(json);
		return {
			code: new MessageCode(2, 5),
			format: ContentFormats.application_json,
			payload: Buffer.from(json, "utf8"),
		};
	}
	const errorResponse: CoapResponse = {
		code: new MessageCode(4, 1),
		format: ContentFormats.text_plain,
		payload: null,
	};

	before(() => {
		// coap.observe should resolve
		fakeCoap.observe = stub(coap, "observe")
			.callsFake((path: string, method, cb) => {
				rememberCallback(path, cb);
				return Promise.resolve();
			});
		fakeCoap.request = stub(coap, "request");
		fakeCoap.stopObserving = stub(coap, "stopObserving");
		fakeCoap.reset = stub(coap, "reset");
	});

	after(() => {
		for (const method of Object.keys(fakeCoap)) {
			fakeCoap[method].restore();
		}
	});

	afterEach(() => {
		for (const method of Object.keys(fakeCoap)) {
			fakeCoap[method].resetHistory();
		}
	});

	describe("observeResource => ", () => {
		it("should call coap.observe with the correct arguments", async () => {
			const cb = spy();
			const expectedUrl = devicesUrl;
			const expectedMethod = "get";
			await tradfri.observeResource("15001", cb);
			fakeCoap.observe.should.have.been.calledWith(expectedUrl, expectedMethod, cb);
		});

		it("calling it again should not call coap.observe", async () => {
			const cb = spy();
			await tradfri.observeResource("15001", cb);
			fakeCoap.observe.should.not.have.been.called;
		});
	});

	describe("stopObservingResource => ", () => {
		it("should call coap.stopObserving with the correct url", () => {
			const expectedUrl = devicesUrl;
			tradfri.stopObservingResource("15001");
			fakeCoap.stopObserving.should.have.been.calledWith(expectedUrl);
		});

		it("calling it again should not call coap.stopObserving", () => {
			tradfri.stopObservingResource("15001");
			fakeCoap.stopObserving.should.not.have.been.called;
		});
	});

	describe("reset => ", () => {
		it("should call coap.reset", () => {
			tradfri.reset();
			fakeCoap.reset.should.have.been.called;
		});
	});

	describe("destroy => ", () => {
		it("should call coap.reset", () => {
			tradfri.destroy();
			fakeCoap.reset.should.have.been.called;
		});
	});

	describe("observeDevices => ", () => {

		it("should call coap.observe for the devices endpoint", async () => {
			await tradfri.observeDevices();
			fakeCoap.observe.should.have.been.calledWith(devicesUrl);
		});

		it("should call coap.observe for each observed device", async () => {
			const devices = [65536, 65537];
			await observeDevices_callback(createResponse(devices));

			fakeCoap.observe.should.have.been.calledTwice;
			fakeCoap.observe.should.have.been.calledWith(`${devicesUrl}/65536`);
			fakeCoap.observe.should.have.been.calledWith(`${devicesUrl}/65537`);

			// we intercepted the device_callback, so we need to manually call it
			// now for the following tests to work
			await observeDevice_callbacks[65536](createResponse(emptyAccessory));
			await observeDevice_callbacks[65537](createResponse(emptyAccessory));
		});

		it("when a device is added, it should only call observe for that one", async () => {
			const devices = [65536, 65537, 65538];
			await observeDevices_callback(createResponse(devices));

			fakeCoap.observe.should.have.been.calledOnce;
			fakeCoap.observe.should.have.been.calledWith(`${devicesUrl}/65538`);

			// we intercepted the device_callback, so we need to manually call it
			// now for the following tests to work
			await observeDevice_callbacks[65538](createResponse(emptyAccessory));
		});

		it(`when a device is removed, on("device removed") should be called with its id`, async () => {

			const leSpy = spy();
			tradfri.on("device removed", leSpy);

			const devices = [65537, 65538];
			await observeDevices_callback(createResponse(devices));

			fakeCoap.observe.should.not.have.been.called;
			leSpy.should.have.been.calledOnce;
			leSpy.should.have.been.calledWithExactly(65536);

			tradfri.removeAllListeners();
		});

		it("when the server returns a code other than 2.05, only emit an error", async () => {

			const removedSpy = spy();
			const errorSpy = spy();
			tradfri
				.on("device removed", removedSpy)
				.on("error", errorSpy)
			;

			await observeDevices_callback(errorResponse);

			fakeCoap.observe.should.not.have.been.called;
			removedSpy.should.not.have.been.called;
			errorSpy.should.have.been.calledOnce;
			expect(errorSpy.getCall(0).args[0]).to.be.an.instanceOf(Error);
			expect(errorSpy.getCall(0).args[0].message.startsWith("unexpected")).to.be.true;

			tradfri.removeAllListeners();
		});

	});

});
