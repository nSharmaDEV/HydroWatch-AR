/* Separate synthetic prototype. No network, browser storage, uploads or real contact actions. */
(() => {
  'use strict'
  const $ = selector => document.querySelector(selector)
  // Reused from water-alert/src/icons.tsx. Lucide v1.70.0, ISC License,
  // Copyright (c) Lucide Contributors; WAVE's own droplet is identified there.
  const icons = {
    'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
    'chevron-left': ['m15 18-6-6 6-6'],
    'chevron-right': ['m9 18 6-6-6-6'],
    'triangle-alert': ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
    receipt: ['M12 17V7', 'M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8', 'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z'],
    gauge: ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
    water: ['M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z', 'M9 15c0 2 1 3 3 3'],
    'file-text': ['M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z', 'M14 2v5a1 1 0 0 0 1 1h5', 'M10 9H8', 'M16 13H8', 'M16 17H8'],
    'file-down': ['M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z', 'M14 2v5a1 1 0 0 0 1 1h5', 'M12 18v-6', 'm9 15 3 3 3-3'],
    ellipsis: ['M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'],
    mail: ['m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7', 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z'],
    phone: ['M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384'],
    plus: ['M5 12h14', 'M12 5v14'],
  }
  document.querySelectorAll('[data-icon]').forEach(slot => {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'icon' })) svg.setAttribute(key, value)
    icons[slot.dataset.icon].forEach(d => { const path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); svg.append(path) })
    slot.replaceWith(svg)
  })
  const address = ['address', 'Service address', 'Street address, apartment or lot number, and town where the issue happened.']
  const account = ['account', 'Account number', 'Find this on your water bill. Leave blank if you don’t have it.']
  const started = ['started', 'When did it start?', 'A date or approximate time, such as November 6 in the evening.']
  const ongoing = ['ongoing', 'Is it still happening?', 'Tell them if it is ongoing, has stopped, or you aren’t sure.']
  const configs = {
    billing: {
      title: 'What looks wrong with the bill?', subject: 'Question about a charge on my water bill', intro: 'I’m writing about a charge on my water bill.',
      checks: ['A charge I don’t recognize', 'The same charge appears twice', 'The amount is different than expected', 'Something else'],
      sentences: ['There is a charge on my bill that I don’t recognize.', 'The same charge appears twice on my bill.', 'The amount on my bill is different than I expected.', 'I have another concern about this bill.'],
      placeholder: 'Describe the charge you’re questioning, what you expected, and what looks different. Mention its bill label or compare it with a previous bill. Leave out anything you don’t know.',
      fields: [[...address.slice(0, 1), 'Billing address', address[2]], account, ['bill', 'Which bill?', 'The month, billing period, or date printed on the bill.'], ['amount', 'Amount in question', 'For example, a $25 extra fee or the difference from your previous bill.']],
      actions: ['Review the charge', 'Explain the bill', 'Explain available next steps', 'Something else'],
      requests: ['review the charge I’m questioning', 'explain how this bill was calculated and what the charge covers', 'explain the available next steps', 'help with the additional request below'],
      actionPlaceholder: 'Explain what you’d like clarified, such as how the charge was calculated, which billing period it covers, or what you can do if it was added in error.',
      questionPlaceholder: 'Add another question you want answered. For example, ask for a written explanation of the charge or a copy of any notice that applies to it.',
    },
    advisory: {
      title: 'What would you like clarified?', subject: 'Question about a water advisory', intro: 'I have a question about a water advisory.',
      checks: ['Whether the notice applies to me', 'What instructions I should follow', 'Whether there is an update', 'My water service is also affected'],
      sentences: ['I would like to know whether the notice applies to my service address.', 'I would like clarification of the published instructions.', 'I would like to know whether an official update is available.', 'My water service is also affected.'],
      placeholder: 'Describe the advisory or notice you saw, the date on it, and what you want clarified. If you know the named affected area, include it. Don’t guess whether your address is covered.',
      fields: [address, account, ['notice', 'Which notice?', 'The title, published date, or named affected area on the notice.'], ['noticed', 'When did you see it?', 'The approximate date and where you saw the advisory.']],
      actions: ['Clarify whether it applies to me', 'Explain the published instructions', 'Share the latest official update', 'Something else'],
      requests: ['clarify whether the advisory applies to my service address', 'explain the published instructions', 'share the latest official update, if available', 'help with the additional request below'],
      actionPlaceholder: 'Say which part of the notice needs clarification, or ask where to find the latest published update. Do not assume an advisory has been lifted because a notice is missing.',
      questionPlaceholder: 'Add another question, such as where to find a written notice or an official update for your specific service address.',
    },
    service: {
      title: 'What happened with your service?', subject: 'Question about a water-service interruption', intro: 'I’m writing about a water-service issue.',
      checks: ['No water', 'Low water pressure', 'Service comes and goes', 'Something else'],
      sentences: ['I experienced no water service.', 'I experienced low water pressure.', 'My water service comes and goes.', 'I have another concern about my water service.'],
      placeholder: 'Describe the interruption or low pressure, where you noticed it, and whether all taps or only some are affected. Include any pattern you have noticed; leave out anything unknown.',
      fields: [address, account, started, ongoing, ['frequency', 'How often?', 'One time, several times, or a pattern you noticed. Include approximate times if known.']],
      actions: ['Look into the interruption', 'Explain the cause, if known', 'Explain available next steps', 'Something else'],
      requests: ['look into the service interruption or low pressure', 'explain the cause, if known', 'explain the available next steps', 'help with the additional request below'],
      actionPlaceholder: 'Explain what would help, such as an update about the interruption, clarification of any service notice, or the next step for reporting continued low pressure.',
      questionPlaceholder: 'Add another question, such as whether there is a written service notice or where to check for restoration updates.',
    },
    quality: {
      title: 'What have you noticed?', subject: 'Question about a water-quality concern', intro: 'I’m writing about something I noticed with my tap water.',
      checks: ['An unusual color or appearance', 'An unusual smell', 'Particles or cloudiness', 'Something else'],
      sentences: ['I noticed an unusual color or appearance.', 'I noticed an unusual smell.', 'I noticed particles or cloudiness.', 'I have another concern about the water’s appearance or smell.'],
      placeholder: 'Describe the appearance or smell in your own words, which taps are affected, and whether it happens with hot or cold water. Observations do not establish the cause or whether the water is safe.',
      fields: [address, account, started, ongoing, ['frequency', 'How often?', 'Each time you run a tap, at certain times, or only once. Leave blank if unsure.']],
      actions: ['Look into my concern', 'Explain available next steps', 'Share any relevant published notice', 'Something else'],
      requests: ['look into my concern', 'explain the available next steps', 'share any relevant published notice', 'help with the additional request below'],
      actionPlaceholder: 'Say what you’d like the supplier to explain about your observations and what next step they recommend. This message is not a water test or safety assessment.',
      questionPlaceholder: 'Add another question, such as how the supplier handles concerns like this or whether a relevant written notice is available.',
    },
    report: {
      title: 'What is your report question about?', subject: 'Question about a dated water report', intro: 'I have a question about a dated water report, not a current safety assessment.',
      checks: ['Help understanding a finding', 'Whether a listed issue was addressed', 'A notice mentioned in the report', 'Something else'],
      sentences: ['I would like help understanding a finding in the report.', 'I would like to know whether a listed historical issue was addressed.', 'I would like to ask about a notice mentioned in the report.', 'I have another question about the dated report.'],
      placeholder: 'Include the report year, page number, and the specific wording or finding you want explained. Keep the dates as printed. A historical finding does not establish current water safety or compliance.',
      fields: [address, account, ['year', 'Report year', 'The year printed on the annual report, not the date you downloaded it.'], ['page', 'Page or finding', 'A page number, heading, or exact excerpt identifying your question.']],
      actions: ['Explain the dated finding', 'Tell me whether it was addressed', 'Share a copy of any related notice', 'Something else'],
      requests: ['explain the dated finding', 'tell me whether the historical issue was addressed', 'share a copy of any related notice', 'help with the additional request below'],
      actionPlaceholder: 'Explain which dated finding you want clarified, or ask for records showing what happened afterward. Do not describe the report as evidence of current safety or compliance.',
      questionPlaceholder: 'Add another question about the dated report, such as where to find a related written notice or documentation of any later action.',
    },
    other: {
      title: 'Tell us a little about the issue', subject: 'Question about my water service', intro: 'I’m writing with a question about my water service.',
      checks: ['An account question', 'A notice I received', 'A question about contacting the supplier', 'Something else'],
      sentences: ['I have a question about my account.', 'I have a question about a notice I received.', 'I need help identifying the right contact at the supplier.', 'I have another water-service question.'],
      placeholder: 'Describe what happened, what you noticed, and what you want the supplier to understand. Include any relevant notice wording or event details, and leave out anything unknown.',
      fields: [address, account, ['when', 'When did it happen?', 'An approximate date or period, if it helps explain the issue.'], ['reference', 'Relevant notice or reference', 'The title or date of a notice, or a reference number you were given.']],
      actions: ['Look into the issue', 'Explain what happened', 'Explain available next steps', 'Something else'],
      requests: ['look into the issue', 'explain what happened', 'explain the available next steps', 'help with the additional request below'],
      actionPlaceholder: 'Explain the response you would find useful, such as a written explanation, clarification of a notice, or the right person to contact next.',
      questionPlaceholder: 'Add another question you would like answered, such as where to get a written explanation or a copy of a relevant notice.',
    },
  }
  const state = { issue: 'billing', step: 1, branches: {}, edited: false, signature: '' }
  const initialAddress = '123 Example Lane, Apt 2, Sampletown, AR'
  function branch() {
    return state.branches[state.issue] ||= { observations: state.issue === 'billing' ? [0] : [], actions: state.issue === 'billing' ? [0, 1] : [], detail: '', actionDetail: '', fields: { address: initialAddress, ...(state.issue === 'billing' ? { bill: 'November 2026', amount: '$25 service adjustment' } : {}) } }
  }
  function checklist(target, values, selected, onChange) {
    target.replaceChildren()
    values.forEach((text, index) => {
      const label = document.createElement('label')
      label.className = 'check-row'
      const input = document.createElement('input')
      input.type = 'checkbox'; input.checked = selected.includes(index)
      const span = document.createElement('span'); span.textContent = text
      input.addEventListener('change', () => onChange([...target.querySelectorAll('input')].flatMap((item, i) => item.checked ? [i] : [])))
      label.append(input, span); target.append(label)
    })
  }
  function renderIssue() {
    const config = configs[state.issue], data = branch()
    document.querySelectorAll('[data-issue]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.issue === state.issue)))
    $('#observations-heading').textContent = config.title
    $('#issue-detail').placeholder = config.placeholder
    $('#issue-detail').value = data.detail
    $('#action-detail').placeholder = config.actionPlaceholder
    $('#action-detail').value = data.actionDetail
    $('#questions').placeholder = config.questionPlaceholder
    checklist($('#observations'), config.checks, data.observations, values => { data.observations = values })
    checklist($('#actions'), config.actions, data.actions, values => { data.actions = values })
    $('#context-fields').replaceChildren()
    config.fields.forEach(([key, title, placeholder]) => {
      const label = document.createElement('label'); label.className = 'field'
      const span = document.createElement('span'); span.textContent = title
      const small = document.createElement('small'); small.textContent = 'Optional'; span.append(small)
      const input = document.createElement('input'); input.id = `context-${key}`; input.autocomplete = 'off'
      input.placeholder = placeholder; input.value = data.fields[key] || ''; label.htmlFor = input.id
      input.addEventListener('input', () => { data.fields[key] = input.value })
      label.append(span, input); $('#context-fields').append(label)
    })
  }
  function generated() {
    const config = configs[state.issue], data = branch()
    const parts = ['Hello Clearwater Example Water,', config.intro]
    const location = [data.fields.address && `My service address is ${data.fields.address}.`, data.fields.account && `My account number is ${data.fields.account}.`].filter(Boolean).join(' ')
    if (location) parts.push(location)
    const details = config.fields.filter(([key]) => !['address', 'account'].includes(key)).flatMap(([key, title]) => data.fields[key]?.trim() ? [`${title.replace(/\?$/, '')}: ${data.fields[key].trim()}.`] : [])
    if (details.length) parts.push(details.join('\n'))
    const observations = data.observations.map(index => config.sentences[index])
    if (observations.length) parts.push(observations.join(' '))
    if (data.detail.trim()) parts.push(data.detail.trim())
    if ($('#attempts').value.trim()) parts.push(`What I have already tried: ${$('#attempts').value.trim()}`)
    const requests = data.actions.map(index => config.requests[index])
    if (requests.length) parts.push(`Could you please:\n${requests.map((request, index) => `${index + 1}. ${request.charAt(0).toUpperCase() + request.slice(1)}.`).join('\n')}`)
    if (data.actionDetail.trim()) parts.push(data.actionDetail.trim())
    if ($('#questions').value.trim()) parts.push($('#questions').value.trim())
    parts.push('I’d appreciate a written reply when you have had a chance to review this.')
    if ($('#reply-contact').value.trim()) parts.push(`You can reach me at ${$('#reply-contact').value.trim()}.`)
    parts.push(['Thank you,', $('#resident-name').value.trim()].filter(Boolean).join('\n'))
    const subject = config.subject + (data.fields.account?.trim() ? ` — account ${data.fields.account.trim()}` : '') + (state.issue === 'billing' && data.fields.bill?.trim() ? ` (${data.fields.bill.trim()})` : '')
    return { subject, message: parts.join('\n\n') }
  }
  function resizeEditor(element) { element.style.height = 'auto'; element.style.height = `${element.scrollHeight + 2}px` }
  function updateEmail(replace = false) {
    const draft = generated(), signature = JSON.stringify(draft)
    if (!state.edited || replace) {
      $('#email-subject').value = draft.subject; $('#email-message').value = draft.message
      state.signature = signature; state.edited = false; $('#draft-update').hidden = true
    } else $('#draft-update').hidden = state.signature === signature
    $('#call-text').textContent = `Hello, I’m calling about ${configs[state.issue].subject.toLowerCase()}.\n\n${branch().detail.trim() || configs[state.issue].sentences[branch().observations[0]] || 'I’d like to explain my concern.'}\n\n${branch().actions.length ? 'Could you please ' + configs[state.issue].requests[branch().actions[0]] + '?' : 'Who would be the right person to speak with?'}`
    resizeEditor($('#email-subject')); resizeEditor($('#email-message'))
  }
  function go(number) {
    state.step = number
    document.querySelectorAll('[data-screen]').forEach(screen => { screen.hidden = Number(screen.dataset.screen) !== number })
    document.querySelectorAll('[data-step]').forEach(button => {
      const step = Number(button.dataset.step)
      if (step === number) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current')
      button.classList.toggle('visited', step < number)
    })
    $('#back').classList.toggle('at-start', number === 1)
    if (number === 4) updateEmail()
    $(`#screen-title-${number}`).focus({ preventScroll: true })
    $('.journey-top').scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  const messages = {
    email: 'Preview: an email app would open here. No app was opened and nothing was sent.',
    copy: 'Simulated copy: the email would be copied here. Your clipboard has not been changed.',
    call: 'Preview: your phone app would open here. No call was placed.',
    attachment: 'Preview: choose a bill, photo, or correspondence here. No file was opened or uploaded.',
    contact: 'Preview contact option: Arkansas Attorney General consumer assistance. [NEEDS: verified contact and routing before implementation.] No agency contacted.',
    record: 'Preview: you would record your own contact date and method here. Nothing is marked sent or saved.',
    download: 'Simulated download: this control would save a clearly labeled preview file. No download was created.',
    reminder: 'Preview: a calendar reminder could be downloaded here. No event or notification was created.',
  }
  let feedbackTimer
  function feedback(message) { clearTimeout(feedbackTimer); $('#feedback').textContent = message; $('#feedback').hidden = false; feedbackTimer = setTimeout(() => { $('#feedback').hidden = true }, 10000) }
  document.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button) return
    if (button.dataset.step || button.dataset.next || button.dataset.go) go(Number(button.dataset.step || button.dataset.next || button.dataset.go))
    if (button.dataset.issue) { state.issue = button.dataset.issue; renderIssue() }
    if (button.id === 'back' && state.step > 1) go(state.step - 1)
    if (button.dataset.mock) feedback(messages[button.dataset.mock])
    if (button.dataset.view) {
      $('#prototype').classList.toggle('phone', button.dataset.view === 'phone')
      document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)))
      if (state.step === 4) requestAnimationFrame(() => { resizeEditor($('#email-subject')); resizeEditor($('#email-message')) })
    }
    if (button.id === 'rebuild') {
      if (!state.edited || window.confirm('Replace your manually edited preview email with a new version from your answers?')) updateEmail(true)
    }
  })
  $('#issue-detail').addEventListener('input', event => { branch().detail = event.target.value })
  $('#action-detail').addEventListener('input', event => { branch().actionDetail = event.target.value })
  for (const selector of ['#email-subject', '#email-message']) $(selector).addEventListener('input', event => { state.edited = true; resizeEditor(event.target) })
  $('#feedback').addEventListener('click', () => { $('#feedback').hidden = true })
  document.addEventListener('keydown', event => { if (event.key === 'Escape') $('#feedback').hidden = true })
  new ResizeObserver(() => { if (state.step === 4) { resizeEditor($('#email-subject')); resizeEditor($('#email-message')) } }).observe($('#prototype'))
  renderIssue()
  $('#back').classList.add('at-start')
})()
