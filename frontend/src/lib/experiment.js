// A B test for roadmap saving:
// 'warning' keeps the save button and prompts
// 'autosave' saves every edit
// assigned at random once per browser and saved in local storage
// ?variant=warning or ?variant=autosave overrides it for testing
export const VARIANT_KEY = 'coursePlanner.roadmapVariant'

export const FEEDBACK_FORM_URLS = {
  warning: 'https://forms.gle/XcnSJ3aA5s18AJP6A',
  autosave: 'https://forms.gle/mWMvNHEa4ffryTaK9',
}

const VARIANTS = Object.keys(FEEDBACK_FORM_URLS)

function readStoredVariant() {
  try {
    return localStorage.getItem(VARIANT_KEY)
  } catch {
    return null
  }
}

function storeVariant(variant) {
  try {
    localStorage.setItem(VARIANT_KEY, variant)
  } catch {
    // storage blocked so variant won't stick
  }
}

export function getRoadmapVariant() {
  const requested = new URLSearchParams(window.location.search).get('variant')
  if (VARIANTS.includes(requested)) {
    storeVariant(requested)
    return requested
  }

  const stored = readStoredVariant()
  if (VARIANTS.includes(stored)) return stored

  const assigned = VARIANTS[Math.floor(Math.random() * VARIANTS.length)]
  storeVariant(assigned)
  return assigned
}
