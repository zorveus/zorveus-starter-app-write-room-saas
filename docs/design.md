# Write room interface

The app is a writing desk with customer usage beside it. The document is the largest element. Account, plan, and billing details remain available without competing with the text.

## Visual tokens

| Token | Value | Role |
| --- | --- | --- |
| Plum | `#302B46` | Navigation and primary text |
| Lilac | `#7658C9` | Main actions and active controls |
| Lavender | `#F3F1F8` | Workspace background |
| Paper | `#FFFFFF` | Draft and rewrite canvas |
| Slate | `#746F82` | Secondary text |
| Green | `#27745C` | Confirmed and configured states |

Instrument Sans handles interface labels. Newsreader handles the main heading and document text. Both fonts are served locally from npm packages. Body text stays left-aligned.

## Layout

A narrow persistent sidebar holds account and allowance. The main workspace presents a two-page editing desk, followed by the current customer's Activity.

```text
┌─────────────┬───────────────────────────────────────────┐
│ Write room  │ Writing workspace              Account   │
│             ├───────────────────────────────────────────┤
│ Write       │ A clearer draft. Same voice.   Focus mode │
│ Activity    │                                           │
│             │ ┌──────────────────┬────────────────────┐ │
│ Demo account│ │ Your draft       │ Your rewrite       │ │
│             │ │                  │                    │ │
│ Plus        │ │ manuscript text  │ manuscript text    │ │
│ Live credits│ │                  │                    │ │
│             │ └──────────────────┴────────────────────┘ │
│             │ Samples                    Rewrite text   │
│             │                                           │
│ Zorveus     │ Customer Activity           Refresh usage │
└─────────────┴───────────────────────────────────────────┘
```

On phones the account and allowance move above the editor, and the draft and rewrite stack. Focus mode temporarily removes navigation and billing history while preserving editor state. Escape restores the workspace.

## Interaction decisions

- Use one chargeable action, named Rewrite text. The visible keyboard shortcut invokes the same action.
- Keep sample insertion explicit and disable it during generation. Samples never generate automatically.
- Show in-progress feedback inside the output pane. Preserve previous output during a later request or billing failure.
- Copy text with inline confirmation. Use as draft replaces the input only after an explicit click.
- Put detailed setup instructions in an expandable section. Never conceal the fact that generation is unavailable.
- Put allowance policy details behind disclosure, while showing the plan and live balance immediately.
- Clear customer-specific state when changing accounts. Do not persist drafts in shared browser storage.
- Use restrained motion for generation progress and user-triggered state changes. Respect reduced motion.

## Review against the brief

The previous design gave the sidebar and decorative workspace title too much room. This revision spends its visual emphasis on the paired document pages and readable text. It removes decorative Unicode symbols and generic dashboard cards, and uses a consistent line-icon set. Billing still reports only authoritative data. No added style, tone, or plan selector can override the trusted server configuration.

## Motion

Focus mode animates the sidebar track, editor width, and supporting panels over 480 ms. Opening a disclosure uses a 320 ms grid-height transition. Explicit sample insertion, restore, and use-as-draft actions reveal the changed text over 320 ms. Typing stays immediate.

A completed rewrite enters over 420 ms. Copy confirmation and changed balance labels use short fades without counting through invented intermediate values. Button press and hover feedback use 180 to 260 ms transitions. Account changes reveal the new workspace after the old customer state has been removed.

CSS transitions and the editor's Web Animations helper respect reduced motion. Request submission, network results, and billing state updates are not delayed for animation. Collapsed disclosures and focus-mode support panels are inert and hidden from assistive technology.

## Typography and copy reduction

The editor text is 24 px. Main controls and input labels are 16 px, with supporting text at 14 to 15 px. Small avatar initials are the only intentionally smaller text. The default view has one heading, two editor labels, one sample action, word counts, and the rewrite action. It no longer repeats the headline in a subtitle, toolbar, placeholder, and empty-state message.

Setup is one line with an expandable Set up action. Demo-account guidance and funding explanations are in their respective disclosures. The sidebar quote, plan footnote, repeated connection warnings, and generic editor captions are removed. Activity errors replace the empty-state panel instead of duplicating it. Existing motion and reduced-motion behavior remain in place.
