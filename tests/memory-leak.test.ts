/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates a disposable model object inside a function boundary, disposes it, forces
 * garbage collection via global.gc (--expose-gc in vitest.config.ts), then asserts via
 * WeakRef that the object was collected. V8 requires a function boundary (not merely
 * a block scope) so local strong references die when the helper returns.
 */

import { describe, expect, it } from "vitest";
import { SpecialRelativityModel } from "../src/common/model/SpecialRelativityModel.js";
import { TimeModel } from "../src/common/TimeModel.js";
import { LightClockModel } from "../src/light-clock/model/LightClockModel.js";
import { RelativisticDopplerModel } from "../src/relativistic-doppler/model/RelativisticDopplerModel.js";
import { SpacetimeDiagramModel } from "../src/spacetime/model/SpacetimeDiagramModel.js";
import { TwinParadoxModel } from "../src/twin-paradox/model/TwinParadoxModel.js";

/**
 * Force garbage collection with multiple passes. When `earlyExitRef` is supplied
 * the loop bails as soon as the object is confirmed collected. The setTimeout(0)
 * yield after a live deref() avoids the WeakRef macrotask-liveness pin.
 */
async function forceGC(earlyExitRef?: WeakRef<object>): Promise<void> {
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (earlyExitRef !== undefined && earlyExitRef.deref() === undefined) {
      return;
    }
    if (earlyExitRef !== undefined) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
}

function createAndDisposeTimeModel(): WeakRef<object> {
  const model = new TimeModel();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

/**
 * Every disposable model in the sim, each behind its own function boundary. The
 * screen models are the ones worth watching: they each build a handful of
 * DerivedProperties over their sub-models, and a DerivedProperty that is not
 * disposed keeps a listener on its dependencies — which keeps the whole graph
 * alive.
 */
const DISPOSABLE_MODELS: { readonly name: string; readonly createAndDispose: () => WeakRef<object> }[] = [
  { name: "TimeModel", createAndDispose: createAndDisposeTimeModel },
  {
    name: "SpecialRelativityModel",
    createAndDispose: () => {
      const model = new SpecialRelativityModel();
      const ref = new WeakRef<object>(model);
      model.dispose();
      return ref;
    },
  },
  {
    name: "LightClockModel",
    createAndDispose: () => {
      const model = new LightClockModel();
      const ref = new WeakRef<object>(model);
      model.dispose();
      return ref;
    },
  },
  {
    name: "SpacetimeDiagramModel",
    createAndDispose: () => {
      const model = new SpacetimeDiagramModel();
      const ref = new WeakRef<object>(model);
      model.dispose();
      return ref;
    },
  },
  {
    name: "TwinParadoxModel",
    createAndDispose: () => {
      const model = new TwinParadoxModel();
      const ref = new WeakRef<object>(model);
      model.dispose();
      return ref;
    },
  },
  {
    name: "RelativisticDopplerModel",
    createAndDispose: () => {
      const model = new RelativisticDopplerModel();
      const ref = new WeakRef<object>(model);
      model.dispose();
      return ref;
    },
  },
];

describe("Memory leak regression", () => {
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("sanity: plain object is collected", async () => {
    const ref = (() => new WeakRef({ hello: "world" }))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  for (const { name, createAndDispose } of DISPOSABLE_MODELS) {
    it(`${name} is collected after dispose`, async () => {
      const ref = createAndDispose();
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });
  }

  it("double dispose() does not throw", () => {
    const model = new TimeModel();
    model.dispose();
    expect(() => model.dispose()).not.toThrow();
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposeTimeModel());
    }
    await forceGC();
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });
});
