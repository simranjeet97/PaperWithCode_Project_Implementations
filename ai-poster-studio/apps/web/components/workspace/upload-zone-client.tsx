"use client"

import { useState } from "react"
import { TemplatePicker } from "./template-picker"
import { UploadZone } from "./upload-zone"

export function UploadZoneClient() {
  const [template, setTemplate] = useState("cvpr-portrait")
  return (
    <div data-template={template}>
      <UploadZone />
      <TemplatePicker value={template} onChange={setTemplate} />
    </div>
  )
}
