import { Want } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { abilityDelegatorRegistry, TestRunner } from '@kit.TestKit';

export default class OpenHarmonyTestRunner implements TestRunner {
  onPrepare(): void {
    hilog.info(0x0000, 'JingweiTest', '%{public}s', 'test runner prepared');
  }

  async onRun(): Promise<void> {
    const argumentsValue = abilityDelegatorRegistry.getArguments();
    const delegator = abilityDelegatorRegistry.getAbilityDelegator();
    const moduleName = argumentsValue.parameters['-m'];
    const want: Want = {
      bundleName: argumentsValue.bundleName,
      moduleName,
      abilityName: 'TestAbility'
    };
    try {
      await delegator.startAbility(want);
    } catch (error) {
      hilog.error(0x0000, 'JingweiTest', 'failed to start test ability: %{public}s', String(error));
      throw new Error(String(error));
    }
  }
}
