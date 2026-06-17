---
title: "Payload Block Sync Rules"
description: "blog block schema synchronization with the app AI pipeline."
order: 1
---

## Blog Block Schemas And App AI Pipeline

* `client/payload/blocks/blogBlocks.ts` and `app/src/pipelines/definitions/blog-content-revision/steps/GenerateBlogContentRevisionAIStep.ts` are intentionally duplicated.
* Any edit to block slugs, field names, field requirements, array constraints, enum values, or option sets in `client/payload/blocks/blogBlocks.ts` must be mirrored in `app/src/pipelines/definitions/blog-content-revision/steps/GenerateBlogContentRevisionAIStep.ts` in the same change.
* Do not merge `client/payload/blocks/blogBlocks.ts` changes without matching synchronization updates in the app pipeline file.
