"use client"

import { useState } from "react"
import { UploadZone } from "./upload-zone"
import { TemplatePicker } from "./template-picker"

export function UploadZoneClient() {
  const [template, setTemplate] = useState("cvpr-portrait")
  return (
    <div data-template={template}>
      <UploadZone />
      <TemplatePicker value={template} onChange={setTemplate} />
    </div>
  )
}