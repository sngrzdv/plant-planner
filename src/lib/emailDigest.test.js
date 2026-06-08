import { describe, it, expect } from 'vitest'
import { buildDigestLines, buildDigestSubject, buildTaskDigestMailto } from './emailDigest'

describe('emailDigest', () => {
  it('builds subject for overdue tasks', () => {
    expect(buildDigestSubject({ overdue: [{ title: 'a' }], today: [] })).toContain('просроченных')
  })

  it('builds mailto link', () => {
    const url = buildTaskDigestMailto('user@test.com', {
      today: [{ title: 'Полить томаты' }],
    })
    expect(url).toMatch(/^mailto:/)
    expect(decodeURIComponent(url)).toContain('user@test.com')
  })

  it('includes task titles in body lines', () => {
    const lines = buildDigestLines({ today: [{ title: 'Полить базилик' }] })
    expect(lines.join('\n')).toContain('Полить базилик')
  })
})
