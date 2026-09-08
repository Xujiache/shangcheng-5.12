// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'
import ArtLogo from '../src/components/core/base/art-logo/index.vue'

afterEach(() => vi.unstubAllGlobals())
it('renders the real logo and updates its size without remounting', async () => {
  vi.stubGlobal('computed', computed)
  const wrapper = mount(ArtLogo, { props: { size: 36 } })
  expect(wrapper.find('img').attributes('style')).toContain('36px')
  expect(wrapper.find('img').attributes('alt')).toBe('logo')
  await wrapper.setProps({ size: 48 })
  expect(wrapper.find('img').attributes('style')).toContain('48px')
  wrapper.unmount()
})
