# Confirming supplier contacts

WAVE's Send screen points residents at a supplier's phone number and email. A
wrong number undoes everything else Help does, so the five reviewed suppliers
should be confirmed by a person, not just copied from a directory.

Nothing here is automated. WAVE never calls or emails a supplier itself.

## Who to confirm

| Supplier (ADH ID) | Phone in WAVE | Email in WAVE | Open question |
|---|---|---|---|
| Fayetteville (569) | (479) 575-8386 | tnyander@fayetteville-ar.gov (EPA record; a staff member's address) | Is a shared customer-service inbox better? |
| Springdale (575) | (479) 751-5751 | none | EPA lists 479-387-0769. `[NEEDS: confirm which number residents should call]` |
| Rogers (055) | (479) 621-1142 | WATER@RWU.ORG (ADH) | — |
| Bentonville (041) | (479) 271-3140 | pnewbill@bentonvillear.com (ADH; a staff member's address) | Is a shared customer-service inbox better? |
| Leisure Hills (747) | (479) 549-2158 | LEISUREHILLSWATERCO@GMAIL.COM (EPA) | EPA lists 479-213-1573; ADH lists SUPERCLAIO@YAHOO.COM. `[NEEDS: confirm current phone and email]` |

## Call script

> Hi, I'm a student working on WAVE, a free app that helps Arkansas residents
> contact their water supplier about bills, outages and water-quality questions.
> We want to make sure we send people to the right place. Could you confirm:
>
> 1. the best phone number for customers to call about a bill or a water problem;
> 2. the best email address for customer questions, if you have one;
> 3. whether there is an online form you'd prefer people use instead?
>
> Thank you. We won't share anything except the contact details you give us
> for customers.

Don't ask for personal information, and don't describe WAVE as affiliated with
the supplier or with ADH.

## Recording a confirmation

1. Write down who you spoke to (role, not a personal name, unless they agree),
   the date, and the answers.
2. Update the entry in `src/provider-contacts.ts`: change `phone`, `dial` or
   `email` if needed, and set `confirmedOn: 'YYYY-MM-DD'`.
3. Add a dated line to `IMPLEMENTATION-NOTES.md` and a `CHANGELOG.md` entry.
4. Run `npm test` and `npm run build`.

The Send screen shows "Confirmed by WAVE on [date]" only for entries with
`confirmedOn`. Re-confirm at least once a year; a confirmation older than that
should be treated as unconfirmed.
