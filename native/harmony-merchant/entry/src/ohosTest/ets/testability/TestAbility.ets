import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { abilityDelegatorRegistry } from '@kit.TestKit';
import { Hypium } from '@ohos/hypium';
import testsuite from '../test/List.test';
import { TestRuntime } from './TestRuntime';

export default class TestAbility extends UIAbility {
  onCreate(_want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    TestRuntime.context = this.context;
    Hypium.hypiumTest(
      abilityDelegatorRegistry.getAbilityDelegator(),
      abilityDelegatorRegistry.getArguments(),
      testsuite
    );
  }

  onDestroy(): void {
    TestRuntime.context = undefined;
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    try {
      windowStage.loadContent('testability/pages/Index');
    } catch (error) {
      hilog.error(0x0000, 'JingweiTest', 'failed to load test page: %{public}s', String(error));
    }
  }
}
