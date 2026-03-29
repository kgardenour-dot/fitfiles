import { useEffect } from "react"
import { router, useLocalSearchParams } from "expo-router"

export default function ShareBridge() {
  const params = useLocalSearchParams<{
    sourceUrl?: string
    url?: string
    sourceText?: string
    text?: string
    fileUrl?: string
  }>()

  useEffect(() => {
    const sourceUrl =
      (typeof params.sourceUrl === "string" && params.sourceUrl) ||
      (typeof params.url === "string" && params.url) ||
      ""

    const sourceText =
      (typeof params.sourceText === "string" && params.sourceText) ||
      (typeof params.text === "string" && params.text) ||
      ""

    const fileUrl = typeof params.fileUrl === "string" ? params.fileUrl : ""

    router.replace({
      pathname: "/import",
      params: {
        sourceUrl: sourceUrl || undefined,
        sourceText: sourceText || undefined,
        fileUrl: fileUrl || undefined,
      },
    })
  }, [params])

  return null
}
