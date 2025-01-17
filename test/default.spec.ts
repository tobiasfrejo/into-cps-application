import { test, expect } from "@playwright/test";
import { TestHelper } from "./TestHelpers/Testhelper"

const helper = new TestHelper();

test.describe("Default Test", async () => {
  test.beforeAll(async () => {
    await helper.launch();
  });
  
  test.afterAll(async () => {
    await helper.shutdown();
  });

  test('Is Packaged', async () => {
    const isPackaged = await helper.electronApp.evaluate( async (e) => {
      return e.app.isPackaged;
    });
    expect(isPackaged).toBe(false);
  });
  test('Check version', async () => {
      const text = await helper.window.innerText('#appVersion');
      expect(text).toBe('4.0.7-dev');
  });

});
