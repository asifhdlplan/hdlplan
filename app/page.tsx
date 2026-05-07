"use client"

import { useEffect, useRef, useState } from "react"
import { Download, HelpCircle, Printer, RefreshCw, Save, Search, Settings } from "lucide-react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const ADMIN_PASSWORD = "0707"

const DEFAULT_FORMULA_SETTINGS = {
  weftRsAddition: 3,
  weftBaseFactor: 0.00062,
  weftMeterFactor: 0.91,
  weftLessMultiplier: 0.98,
  warpBaseFactor: 0.0006059,
  warpLessMultiplier: 0.99,
  forecastDyeMultiplier: 1.015,
  forecastWeavingMultiplier: 0.91,
  forecastMeterToYardDivisor: 0.9144,
  forecastFinishingMultiplier: 0.88,
  forecastInspectionMultiplier: 0.95726,
  loomMinutesPerHour: 60,
  loomEfficiency: 0.9,
  loomYardDivisor: 36,
  loomHoursPerDay: 24,
}

type FormulaSettings = typeof DEFAULT_FORMULA_SETTINGS

export default function HDLPlanning() {
  const [theme, setTheme] = useState<"dark" | "light">("light")
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [formulaSettings, setFormulaSettings] = useState<FormulaSettings>(DEFAULT_FORMULA_SETTINGS)
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [adminError, setAdminError] = useState("")
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedGlossaryIndex, setSelectedGlossaryIndex] = useState(0)

  // Weft state
  const [weftInputs, setWeftInputs] = useState(
    Array(6)
      .fill(null)
      .map(() => ({ count: "", ratio: "" }))
  )
  const [ppi, setPpi] = useState("")
  const [rs, setRs] = useState("")
  const [wLen, setWLen] = useState("")
  const [weftResults, setWeftResults] = useState(Array(6).fill(0))
  const [weftTotal, setWeftTotal] = useState(0)

  // Warp state
  const [warpInputs, setWarpInputs] = useState(
    Array(6)
      .fill(null)
      .map(() => ({ count: "", ratio: "" }))
  )
  const [totalEnds, setTotalEnds] = useState("")
  const [warpLength, setWarpLength] = useState("")
  const [warpEnds, setWarpEnds] = useState(Array(6).fill(0))
  const [warpWeights, setWarpWeights] = useState(Array(6).fill(0))
  const [warpTotal, setWarpTotal] = useState(0)

  // Forecast state
  const [forecastWarping, setForecastWarping] = useState("")
  const [forecastResults, setForecastResults] = useState({
    dye: 0,
    siz: 0,
    wev: 0,
    fin: 0,
    ins: 0,
  })

  // Loom production state
  const [loomRpm, setLoomRpm] = useState("")
  const [loomPick, setLoomPick] = useState("")
  const [loomDay, setLoomDay] = useState("")
  const [loomProductionPerHour, setLoomProductionPerHour] = useState(0)
  const [loomProductionForDay, setLoomProductionForDay] = useState(0)

  // Refs for all input fields for arrow key navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleArrowNavigation = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    const inputs = inputRefs.current.filter(Boolean) as HTMLInputElement[]
    const currentPos = inputs.indexOf(e.currentTarget)
    
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault()
      const nextInput = inputs[currentPos + 1]
      if (nextInput) nextInput.focus()
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault()
      const prevInput = inputs[currentPos - 1]
      if (prevInput) prevInput.focus()
    }
  }

  const setInputRef = (el: HTMLInputElement | null, index: number) => {
    inputRefs.current[index] = el
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const resetCalculatorData = () => {
    setWeftInputs(
      Array(6)
        .fill(null)
        .map(() => ({ count: "", ratio: "" }))
    )
    setPpi("")
    setRs("")
    setWLen("")
    setWeftResults(Array(6).fill(0))
    setWeftTotal(0)

    setWarpInputs(
      Array(6)
        .fill(null)
        .map(() => ({ count: "", ratio: "" }))
    )
    setTotalEnds("")
    setWarpLength("")
    setWarpEnds(Array(6).fill(0))
    setWarpWeights(Array(6).fill(0))
    setWarpTotal(0)

    setForecastWarping("")
    setForecastResults({
      dye: 0,
      siz: 0,
      wev: 0,
      fin: 0,
      ins: 0,
    })

    setLoomRpm("")
    setLoomPick("")
    setLoomDay("")
    setLoomProductionPerHour(0)
    setLoomProductionForDay(0)
  }

  const printPage = () => {
    window.print()
  }

  const savePageAsPdf = () => {
    window.print()
  }

  useEffect(() => {
    const savedSettings = window.localStorage.getItem("hdl-formula-settings")
    if (!savedSettings) return

    try {
      setFormulaSettings({ ...DEFAULT_FORMULA_SETTINGS, ...JSON.parse(savedSettings) })
    } catch {
      window.localStorage.removeItem("hdl-formula-settings")
    }
  }, [])

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsInstalled(standalone)

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice

    if (choice.outcome === "accepted") {
      setIsInstalled(true)
    }

    setInstallPrompt(null)
  }

  const openAdminPanel = () => {
    setIsAdminPanelOpen(true)
    setAdminPassword("")
    setAdminError("")
  }

  const closeAdminPanel = () => {
    setIsAdminPanelOpen(false)
    setIsAdminAuthenticated(false)
    setAdminPassword("")
    setAdminError("")
  }

  const unlockAdminPanel = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true)
      setAdminError("")
      setAdminPassword("")
      return
    }

    setAdminError("Invalid password")
  }

  const updateFormulaSetting = (key: keyof FormulaSettings, value: string) => {
    const parsedValue = Number.parseFloat(value)
    setFormulaSettings((current) => ({
      ...current,
      [key]: Number.isFinite(parsedValue) ? parsedValue : 0,
    }))
  }

  const saveFormulaSettings = () => {
    window.localStorage.setItem("hdl-formula-settings", JSON.stringify(formulaSettings))
    setAdminError("Formula settings saved")
  }

  const resetFormulaSettings = () => {
    setFormulaSettings(DEFAULT_FORMULA_SETTINGS)
    window.localStorage.removeItem("hdl-formula-settings")
    setAdminError("Formula settings reset")
  }

  const calculateWeft = () => {
    const ppiVal = Number.parseFloat(ppi) || 0
    const rsVal = Number.parseFloat(rs) || 0
    const lenVal = Number.parseFloat(wLen) || 0

    const ratios = weftInputs.map((w) => Number.parseFloat(w.ratio) || 0)
    const counts = weftInputs.map((w) => Number.parseFloat(w.count) || 0)
    const sumRatio = ratios.reduce((a, b) => a + b, 0)

    const results: number[] = []
    let total = 0

    for (let i = 0; i < 6; i++) {
      if (sumRatio > 0 && counts[i] > 0) {
        const rowWeight =
          (ppiVal *
            (rsVal + formulaSettings.weftRsAddition) *
            formulaSettings.weftBaseFactor *
            lenVal *
            formulaSettings.weftMeterFactor *
            (ratios[i] / sumRatio)) /
          counts[i]
        results.push(rowWeight)
        total += rowWeight
      } else {
        results.push(0)
      }
    }

    setWeftResults(results)
    setWeftTotal(total)
  }

  const calculateWarp = () => {
    const totalEndsVal = Number.parseFloat(totalEnds) || 0
    const lengthVal = Number.parseFloat(warpLength) || 0

    const ratios = warpInputs.map((w) => Number.parseFloat(w.ratio) || 0)
    const counts = warpInputs.map((w) => Number.parseFloat(w.count) || 0)
    const sumRatio = ratios.reduce((a, b) => a + b, 0)

    const ends: number[] = []
    const weights: number[] = []
    let total = 0

    for (let i = 0; i < 6; i++) {
      const endVal = sumRatio > 0 ? totalEndsVal * (ratios[i] / sumRatio) : 0
      const weight = counts[i] > 0 ? (lengthVal * endVal * formulaSettings.warpBaseFactor) / counts[i] : 0
      ends.push(endVal)
      weights.push(weight)
      total += weight
    }

    setWarpEnds(ends)
    setWarpWeights(weights)
    setWarpTotal(total)
  }

  const calculateForecast = () => {
    const warping = Number(forecastWarping) || 0
    const dye = warping * formulaSettings.forecastDyeMultiplier
    const siz = dye
    const wev = formulaSettings.forecastMeterToYardDivisor > 0 ? (siz * formulaSettings.forecastWeavingMultiplier) / formulaSettings.forecastMeterToYardDivisor : 0
    const fin = wev * formulaSettings.forecastFinishingMultiplier
    const ins = fin * formulaSettings.forecastInspectionMultiplier

    setForecastResults({
      dye,
      siz,
      wev,
      fin,
      ins,
    })
  }

  const calculateLoomProduction = () => {
    const rpmVal = Number.parseFloat(loomRpm) || 0
    const pickVal = Number.parseFloat(loomPick) || 0
    const dayVal = Number.parseFloat(loomDay) || 0

    const productionPerHour =
      pickVal > 0 && formulaSettings.loomYardDivisor > 0
        ? (rpmVal * formulaSettings.loomMinutesPerHour * formulaSettings.loomEfficiency) / pickVal / formulaSettings.loomYardDivisor
        : 0
    const productionForDay = productionPerHour * dayVal * formulaSettings.loomHoursPerDay

    setLoomProductionPerHour(productionPerHour)
    setLoomProductionForDay(productionForDay)
  }

  const themeClasses =
    theme === "dark" ? "bg-[#B9CAD6] text-[#1F2F3A]" : "bg-[#D8E4EC] text-[#1F2F3A]"

  const cardClasses =
    theme === "dark"
      ? "bg-[#E4EDF3] border-[#7F98AA] text-[#1F2F3A] shadow-[inset_1px_1px_0_rgba(255,255,255,0.85),inset_-1px_-1px_0_rgba(71,91,108,0.16)]"
      : "bg-[#EEF4F8] border-[#8FA7B8] shadow-[inset_1px_1px_0_rgba(255,255,255,0.95),inset_-1px_-1px_0_rgba(87,108,125,0.16),0_1px_2px_rgba(51,75,92,0.12)]"

  const inputClasses =
    theme === "dark"
      ? "bg-[#FFF7C8] border-[#7E8E99] text-[#1F2F3A] shadow-[inset_1px_1px_2px_rgba(40,55,68,0.24)] focus:bg-[#FFF3A5] focus:border-[#2F5F84] outline-none"
      : "bg-[#FFF7C8] border-[#8A9BA8] text-[#1F2F3A] shadow-[inset_1px_1px_2px_rgba(40,55,68,0.22)] focus:bg-[#FFF3A5] focus:border-[#2F5F84] outline-none"

  const sectionTitleClasses =
    "text-white text-[13px] font-bold mb-3 -mx-3 -mt-3 px-3 py-2 border-b border-[#6C8799] bg-gradient-to-b from-[#6F95B0] via-[#4E7898] to-[#2F5F84]"
  const tableClasses =
    "w-full border-collapse mb-3 text-[12px] bg-[#F7FAFC] border border-[#8FA7B8] [&_th]:bg-gradient-to-b [&_th]:from-[#DCE8F0] [&_th]:to-[#B8CCD9] [&_th]:text-[#1F2F3A] [&_th]:border [&_th]:border-[#8FA7B8] [&_th]:py-1.5 [&_th]:px-2 [&_th]:font-bold [&_td]:border [&_td]:border-[#BFD3E1] [&_td]:bg-[#FBFDFE]"
  const buttonClasses =
    "w-full p-2.5 bg-gradient-to-b from-[#EEF4F8] to-[#BFD3E1] hover:from-[#FFF7C8] hover:to-[#D6E4EE] text-[#1F2F3A] border border-[#7F98AA] rounded-[2px] font-bold cursor-pointer mt-3 active:shadow-[inset_1px_1px_3px_rgba(40,55,68,0.28)] transition-colors"
  const toolbarButtonClasses =
    "h-7 w-7 inline-flex items-center justify-center bg-gradient-to-b from-[#F8FBFD] to-[#BFD3E1] hover:from-[#FFF7C8] hover:to-[#D6E4EE] border border-[#6F8798] text-[#1F2F3A] shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]"
  const primaryResultClasses = "text-[#1F4E79] font-bold"
  const highlightResultClasses = "text-[#0F6F7F] font-bold bg-[#E5F2F4]"
  const summaryClasses =
    "mt-3 p-2.5 bg-[#DCE8F0] border border-[#8FA7B8] rounded-[2px] text-center text-[#1F4E79] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]"
  const adminFieldClasses = `w-full p-1.5 rounded-[1px] border text-right text-[12px] ${inputClasses}`
  const formulaSections: {
    title: string
    formula: string
    fields: { key: keyof FormulaSettings; label: string }[]
  }[] = [
    {
      title: "Warp Calculation",
      formula: "Weight = Length x Ends x Warp Factor / Count",
      fields: [
        { key: "warpBaseFactor", label: "Warp Factor" },
        { key: "warpLessMultiplier", label: "Less KG Multiplier" },
      ],
    },
    {
      title: "Weft Calculation",
      formula: "Weight = PPI x (RS + Add) x Base Factor x Length x Meter Factor x Ratio Share / Count",
      fields: [
        { key: "weftRsAddition", label: "RS Addition" },
        { key: "weftBaseFactor", label: "Base Factor" },
        { key: "weftMeterFactor", label: "Meter Factor" },
        { key: "weftLessMultiplier", label: "Less KG Multiplier" },
      ],
    },
    {
      title: "Forecast Calculation",
      formula: "Dyeing = Warping x Dye; Weaving = Sizing x Weaving / Meter-to-Yard; Finishing and Inspection use multipliers",
      fields: [
        { key: "forecastDyeMultiplier", label: "Dyeing Multiplier" },
        { key: "forecastWeavingMultiplier", label: "Weaving Multiplier" },
        { key: "forecastMeterToYardDivisor", label: "Meter-to-Yard Divisor" },
        { key: "forecastFinishingMultiplier", label: "Finishing Multiplier" },
        { key: "forecastInspectionMultiplier", label: "Inspection Multiplier" },
      ],
    },
    {
      title: "Loom Production",
      formula: "Per Hour = RPM x Minutes x Efficiency / Pick / Yard Divisor; Day = Per Hour x Day x Hours",
      fields: [
        { key: "loomMinutesPerHour", label: "Minutes Per Hour" },
        { key: "loomEfficiency", label: "Efficiency" },
        { key: "loomYardDivisor", label: "Yard Divisor" },
        { key: "loomHoursPerDay", label: "Hours Per Day" },
      ],
    },
  ]
  const glossaryItems = [
    { title: "Warp", description: "The lengthwise yarns arranged on the loom before weaving starts." },
    { title: "Weft", description: "The crosswise yarn inserted through the warp yarns during weaving." },
    { title: "Yarn Count", description: "A numbering system used to determine yarn thickness or fineness." },
    { title: "PPI (Picks Per Inch)", description: "The number of weft yarns inserted within one inch of fabric." },
    { title: "EPI (Ends Per Inch)", description: "The number of warp yarns present within one inch of fabric width." },
    { title: "GSM (Gram per Square Meter)", description: "The weight of fabric measured in grams per square meter." },
    { title: "Warping", description: "The process of preparing warp yarns onto a beam before sizing and weaving." },
    { title: "Sizing", description: "Applying protective chemicals on warp yarns to reduce breakage during weaving." },
    { title: "Loom", description: "A machine used to interlace warp and weft yarns to produce fabric." },
    { title: "Weaving", description: "The fabric manufacturing process where warp and weft yarns are interlaced." },
    { title: "Reed", description: "A loom component used to maintain warp spacing and beat the weft into place." },
    { title: "Heald / Harness", description: "A loom part that controls warp yarn movement during weaving." },
    { title: "Beam", description: "A cylindrical roller used to hold warp yarns in the weaving process." },
    { title: "Selvage", description: "The finished edge of fabric that prevents fraying." },
    { title: "Fabric Construction", description: "The structural specification of fabric including yarn count, EPI, and PPI." },
    { title: "Yarn Ratio", description: "The combination ratio of different yarn counts or materials used in fabric." },
    { title: "Dyeing", description: "The process of adding color to yarn or fabric using dyes and chemicals." },
    { title: "Finishing", description: "Final treatment processes applied to fabric for improved appearance and performance." },
    { title: "Inspection", description: "The quality checking process for detecting fabric defects before delivery." },
    { title: "Loom Efficiency", description: "The percentage of actual loom production compared to maximum possible production." },
    { title: "RPM (Revolution Per Minute)", description: "The rotational speed of loom machinery during production." },
    { title: "Production Forecast", description: "An estimated production output calculated from machine capacity and planning data." },
    { title: "Fabric Width", description: "The usable width of fabric measured from one selvage to another." },
    { title: "Shrinkage", description: "The reduction in fabric dimensions after washing or finishing processes." },
    { title: "Yarn Consumption", description: "The quantity of yarn required to produce a specific amount of fabric." },
    { title: "Grey Fabric", description: "Unfinished woven fabric before dyeing or finishing treatment." },
    { title: "Process Loss", description: "Material loss occurring during textile manufacturing processes." },
    { title: "Article Number", description: "A unique identification number assigned to a specific fabric style or construction." },
    { title: "Planning", description: "The process of organizing production, yarn allocation, and delivery schedules." },
    { title: "Inventory", description: "The available stock of yarn, fabric, or production materials in storage." },
    { title: "Textile Manufacturing", description: "The complete industrial process of converting fiber into finished textile products." },
  ]
  const selectedGlossaryItem = glossaryItems[selectedGlossaryIndex]

  return (
    <div className={`hdl-print-root min-h-screen flex flex-col transition-colors duration-300 ${themeClasses}`}>
      <div className="hdl-print-shell flex-1 p-3">
        {/* Header */}
        <div className="hdl-print-header max-w-[1240px] mx-auto mb-2 border border-[#6F8798] bg-[#C7D8E4] shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex justify-between items-center bg-gradient-to-b from-[#6F95B0] via-[#4E7898] to-[#2F5F84] text-white px-2 py-1 border-b border-[#244C69]">
            <div className="flex items-center gap-2">
              <img
                src="/hdl-logo.png"
                alt="HDL Logo"
                className="w-7 h-7 object-contain bg-white border border-[#BFD3E1] p-0.5"
              />
              <h1 className="text-[15px] font-bold m-0 tracking-normal">HDL PLANNING</h1>
            </div>
            <div className="text-[11px] font-semibold">Enterprise Planning Console</div>
          </div>
          <div className="no-print flex flex-wrap items-center gap-1 px-2 py-1 border-t border-white/70 border-b border-[#8FA7B8] bg-gradient-to-b from-[#EEF4F8] to-[#C7D8E4]">
            <button onClick={savePageAsPdf} className={toolbarButtonClasses} aria-label="Save as PDF" title="Save full page as A4 PDF">
              <Save size={14} />
            </button>
            <button onClick={printPage} className={toolbarButtonClasses} aria-label="Print" title="Print A4 page">
              <Printer size={14} />
            </button>
            <button onClick={() => setIsSearchOpen(true)} className={toolbarButtonClasses} aria-label="Search" title="Textile glossary">
              <Search size={14} />
            </button>
            <button onClick={resetCalculatorData} className={toolbarButtonClasses} aria-label="Reset Data" title="Reset data">
              <RefreshCw size={14} />
            </button>
            <span className="mx-1 h-5 border-l border-[#8FA7B8]" />
            <button onClick={openAdminPanel} className={toolbarButtonClasses} aria-label="Settings" title="Admin Panel">
              <Settings size={14} />
            </button>
            <button onClick={() => setIsHelpOpen(true)} className={toolbarButtonClasses} aria-label="Help" title="About HDL Planning">
              <HelpCircle size={14} />
            </button>
            <span className="mx-1 h-5 border-l border-[#8FA7B8]" />
            <button
              onClick={installApp}
              disabled={!installPrompt || isInstalled}
              className={`${toolbarButtonClasses} disabled:cursor-not-allowed disabled:opacity-55`}
              aria-label="Install App"
              title={isInstalled ? "Installed" : installPrompt ? "Install HDL Planning" : "Install available in Chrome after the app is ready"}
            >
              <Download size={14} />
            </button>
            <span className="text-[11px] font-bold text-[#1F4E79] mr-1">
              {isInstalled ? "INSTALLED" : "INSTALL"}
            </span>
            <span className="mx-1 h-5 border-l border-[#8FA7B8]" />
            <button
              onClick={toggleTheme}
              className="h-7 px-3 bg-gradient-to-b from-[#F8FBFD] to-[#BFD3E1] hover:from-[#FFF7C8] hover:to-[#D6E4EE] border border-[#6F8798] text-[#1F2F3A] text-[11px] font-bold"
            >
              {theme === "dark" ? "LIGHT" : "DEEP"}
            </button>
          </div>
        </div>

        {/* Created by Asif */}
        <p className="text-center text-[11px] opacity-80 mb-3 max-w-[1240px] mx-auto">
          Created by <span className="font-semibold text-[#1F4E79]">Asif</span>
        </p>

        {/* Cards Container */}
        <div className="hdl-print-cards flex gap-3 flex-wrap justify-center max-w-[1240px] mx-auto">
          {/* Weft Calculation */}
          <div className={`hdl-print-card order-2 flex-1 min-w-[320px] max-w-[600px] ${cardClasses} p-3 rounded-[2px] border`}>
            <h2 className={sectionTitleClasses}>
              Weft Calculation
            </h2>
            <table className={tableClasses}>
              <thead>
                <tr>
                  <th className="text-xs">#</th>
                  <th className="text-xs">Count (Ne)</th>
                  <th className="text-xs">Ratio</th>
                  <th className="text-xs">Weight (KG)</th>
                  <th className="text-xs">2% Less KG</th>
                </tr>
              </thead>
              <tbody>
                {weftInputs.map((_, i) => (
                  <tr key={i}>
                    <td className="text-center py-3">{i + 1}</td>
                    <td className="text-center py-3">
                      <input
                        ref={(el) => setInputRef(el, i * 2)}
                        type="number"
                        value={weftInputs[i].count}
                        onChange={(e) => {
                          const newInputs = [...weftInputs]
                          newInputs[i].count = e.target.value
                          setWeftInputs(newInputs)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") calculateWeft()
                          else handleArrowNavigation(e, i * 2)
                        }}
                        className={`w-4/5 p-1.5 rounded-[1px] border text-center ${inputClasses}`}
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        ref={(el) => setInputRef(el, i * 2 + 1)}
                        type="number"
                        value={weftInputs[i].ratio}
                        onChange={(e) => {
                          const newInputs = [...weftInputs]
                          newInputs[i].ratio = e.target.value
                          setWeftInputs(newInputs)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") calculateWeft()
                          else handleArrowNavigation(e, i * 2 + 1)
                        }}
                        className={`w-4/5 p-1.5 rounded-[1px] border text-center ${inputClasses}`}
                      />
                    </td>
                    <td className={`text-center py-3 ${primaryResultClasses}`}>
                      {Math.round(weftResults[i])}
                    </td>
                    <td className={`text-center py-3 ${highlightResultClasses}`}>
                      {Math.round(weftResults[i] * formulaSettings.weftLessMultiplier)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-3 gap-2">
              <input
                ref={(el) => setInputRef(el, 12)}
                type="number"
                placeholder="PPI"
                value={ppi}
                onChange={(e) => setPpi(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateWeft()
                  else handleArrowNavigation(e, 12)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
              <input
                ref={(el) => setInputRef(el, 13)}
                type="number"
                placeholder="RS (Inch)"
                value={rs}
                onChange={(e) => setRs(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateWeft()
                  else handleArrowNavigation(e, 13)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
              <input
                ref={(el) => setInputRef(el, 14)}
                type="number"
                placeholder="Length (Meters)"
                value={wLen}
                onChange={(e) => setWLen(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateWeft()
                  else handleArrowNavigation(e, 14)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
            </div>
            <button
              onClick={calculateWeft}
              className={`no-print ${buttonClasses}`}
            >
              Calculate Weft
            </button>
            <div className={summaryClasses}>
              Total Weft: {Math.round(weftTotal)} KG
            </div>
          </div>

          {/* Warp Calculation */}
          <div className={`hdl-print-card order-1 flex-1 min-w-[320px] max-w-[600px] ${cardClasses} p-3 rounded-[2px] border`}>
            <h2 className={sectionTitleClasses}>
              Warp Calculation
            </h2>
            <table className={tableClasses}>
              <thead>
                <tr>
                  <th className="text-xs">#</th>
                  <th className="text-xs">Count (Ne)</th>
                  <th className="text-xs">Ratio</th>
                  <th className="text-xs">Ends</th>
                  <th className="text-xs">Weight (KG)</th>
                  <th className="text-xs">1% Less KG</th>
                </tr>
              </thead>
              <tbody>
                {warpInputs.map((_, i) => (
                  <tr key={i}>
                    <td className="text-center py-3">{i + 1}</td>
                    <td className="text-center py-3">
                      <input
                        ref={(el) => setInputRef(el, 15 + i * 2)}
                        type="number"
                        value={warpInputs[i].count}
                        onChange={(e) => {
                          const newInputs = [...warpInputs]
                          newInputs[i].count = e.target.value
                          setWarpInputs(newInputs)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") calculateWarp()
                          else handleArrowNavigation(e, 15 + i * 2)
                        }}
                        className={`w-4/5 p-1.5 rounded-[1px] border text-center ${inputClasses}`}
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        ref={(el) => setInputRef(el, 15 + i * 2 + 1)}
                        type="number"
                        value={warpInputs[i].ratio}
                        onChange={(e) => {
                          const newInputs = [...warpInputs]
                          newInputs[i].ratio = e.target.value
                          setWarpInputs(newInputs)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") calculateWarp()
                          else handleArrowNavigation(e, 15 + i * 2 + 1)
                        }}
                        className={`w-4/5 p-1.5 rounded-[1px] border text-center ${inputClasses}`}
                      />
                    </td>
                    <td className={`text-center py-3 ${primaryResultClasses}`}>
                      {Math.round(warpEnds[i])}
                    </td>
                    <td className={`text-center py-3 ${primaryResultClasses}`}>
                      {Math.round(warpWeights[i])}
                    </td>
                    <td className={`text-center py-3 ${highlightResultClasses}`}>
                      {Math.round(warpWeights[i] * formulaSettings.warpLessMultiplier)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-2">
              <input
                ref={(el) => setInputRef(el, 27)}
                type="number"
                placeholder="Total Ends"
                value={totalEnds}
                onChange={(e) => setTotalEnds(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateWarp()
                  else handleArrowNavigation(e, 27)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
              <input
                ref={(el) => setInputRef(el, 28)}
                type="number"
                placeholder="Length (Meters)"
                value={warpLength}
                onChange={(e) => setWarpLength(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateWarp()
                  else handleArrowNavigation(e, 28)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
            </div>
            <button
              onClick={calculateWarp}
              className={`no-print ${buttonClasses}`}
            >
              Calculate Warp
            </button>
            <div className={summaryClasses}>
              Total Warp: {Math.round(warpTotal)} KG
            </div>
          </div>

          {/* Production Forecast */}
          <div className={`hdl-print-card order-3 flex-1 min-w-[320px] max-w-[600px] ${cardClasses} p-3 rounded-[2px] border`}>
            <h2 className={sectionTitleClasses}>
              Production Forecast
            </h2>
            <table className={tableClasses}>
              <thead>
                <tr>
                  <th className="text-xs">Stage</th>
                  <th className="text-xs">Forecast</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center py-2">Warping(M)</td>
                  <td className="text-center py-2">
                    <input
                      ref={(el) => setInputRef(el, 29)}
                      type="number"
                      value={forecastWarping}
                      onChange={(e) => setForecastWarping(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") calculateForecast()
                        else handleArrowNavigation(e, 29)
                      }}
                      className={`w-4/5 p-1.5 rounded-[1px] border text-center ${inputClasses}`}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="text-center py-2">Dyeing(M)</td>
                  <td className={`text-center py-2 ${primaryResultClasses}`}>
                    {Math.round(forecastResults.dye)}
                  </td>
                </tr>
                <tr>
                  <td className="text-center py-2">Sizing(M)</td>
                  <td className={`text-center py-2 ${primaryResultClasses}`}>
                    {Math.round(forecastResults.siz)}
                  </td>
                </tr>
                <tr>
                  <td className="text-center py-2">Weaving(YD)</td>
                  <td className={`text-center py-2 ${primaryResultClasses}`}>
                    {Math.round(forecastResults.wev)}
                  </td>
                </tr>
                <tr>
                  <td className="text-center py-2">Finishing(YD)</td>
                  <td className={`text-center py-2 ${primaryResultClasses}`}>
                    {Math.round(forecastResults.fin)}
                  </td>
                </tr>
                <tr>
                  <td className="text-center py-2 font-bold">Inspection (YD)</td>
                  <td className={`text-center py-2 ${highlightResultClasses}`}>
                    {Math.round(forecastResults.ins)}
                  </td>
                </tr>
              </tbody>
            </table>
            <button
              onClick={calculateForecast}
              className={`no-print ${buttonClasses}`}
            >
              Calculate Forecast
            </button>
          </div>

          {/* Loom Production Calculator */}
          <div className={`hdl-print-card order-4 flex-1 min-w-[320px] max-w-[600px] ${cardClasses} p-3 rounded-[2px] border`}>
            <h2 className={sectionTitleClasses}>
              Loom Production Calculator
            </h2>
            <div className="grid grid-cols-3 gap-2">
              <input
                ref={(el) => setInputRef(el, 31)}
                type="number"
                placeholder="RPM"
                value={loomRpm}
                onChange={(e) => setLoomRpm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateLoomProduction()
                  else handleArrowNavigation(e, 31)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
              <input
                ref={(el) => setInputRef(el, 32)}
                type="number"
                placeholder="Pick"
                value={loomPick}
                onChange={(e) => setLoomPick(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateLoomProduction()
                  else handleArrowNavigation(e, 32)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
              <input
                ref={(el) => setInputRef(el, 33)}
                type="number"
                placeholder="Day"
                value={loomDay}
                onChange={(e) => setLoomDay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") calculateLoomProduction()
                  else handleArrowNavigation(e, 33)
                }}
                className={`p-2 rounded-[1px] border text-center ${inputClasses}`}
              />
            </div>
            <button
              onClick={calculateLoomProduction}
              className={`no-print ${buttonClasses}`}
            >
              Calculate Loom Production
            </button>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="p-2.5 bg-[#DCE8F0] border border-[#8FA7B8] rounded-[2px] text-center text-[#1F4E79] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
                Per Hour: {Math.round(loomProductionPerHour)} YD
              </div>
              <div className="p-2.5 bg-[#E5F2F4] border border-[#8FA7B8] rounded-[2px] text-center text-[#0F6F7F] font-bold shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
                For Day: {Math.round(loomProductionForDay)} YD
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAdminPanelOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1F2F3A]/45 p-3">
          <div className="w-full max-w-[860px] max-h-[88vh] overflow-auto border border-[#5F7789] bg-[#D8E4EC] shadow-[0_8px_24px_rgba(20,35,48,0.38)]">
            <div className="flex items-center justify-between bg-gradient-to-b from-[#6F95B0] via-[#4E7898] to-[#2F5F84] px-2 py-1 text-white border-b border-[#244C69]">
              <div className="text-[13px] font-bold">ADMIN PANEL - FORMULA MAINTENANCE</div>
              <button
                onClick={closeAdminPanel}
                className="h-6 px-2 bg-gradient-to-b from-[#EEF4F8] to-[#BFD3E1] text-[#1F2F3A] border border-[#6F8798] text-[11px] font-bold"
              >
                X
              </button>
            </div>

            {!isAdminAuthenticated ? (
              <div className="m-3 border border-[#8FA7B8] bg-[#EEF4F8] p-3 shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
                <div className="mb-3 bg-gradient-to-b from-[#DCE8F0] to-[#B8CCD9] border border-[#8FA7B8] px-2 py-1 text-[12px] font-bold text-[#1F2F3A]">
                  Password Required
                </div>
                <div className="grid grid-cols-[130px_1fr] items-center gap-2 text-[12px] max-w-[420px]">
                  <label htmlFor="admin-password" className="font-bold">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") unlockAdminPanel()
                    }}
                    className={adminFieldClasses}
                    autoFocus
                  />
                </div>
                {adminError && <div className="mt-2 text-[12px] font-bold text-[#8A3B2D]">{adminError}</div>}
                <div className="mt-3 flex gap-2">
                  <button onClick={unlockAdminPanel} className={`${buttonClasses} mt-0 max-w-[130px] py-1.5`}>
                    Enter
                  </button>
                  <button onClick={closeAdminPanel} className={`${buttonClasses} mt-0 max-w-[130px] py-1.5`}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="m-3 space-y-3">
                <div className="border border-[#8FA7B8] bg-[#EEF4F8] p-2 text-[12px] shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
                  Edit formula constants below. Values are used immediately in calculations; press Save to keep them in this browser.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {formulaSections.map((section) => (
                    <div key={section.title} className="border border-[#8FA7B8] bg-[#EEF4F8] shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
                      <div className="bg-gradient-to-b from-[#DCE8F0] to-[#B8CCD9] border-b border-[#8FA7B8] px-2 py-1 text-[12px] font-bold text-[#1F2F3A]">
                        {section.title}
                      </div>
                      <div className="p-2">
                        <div className="mb-2 border border-[#BFD3E1] bg-[#F7FAFC] p-2 text-[11px] font-semibold text-[#395466]">
                          {section.formula}
                        </div>
                        <div className="space-y-2">
                          {section.fields.map((field) => (
                            <div key={field.key} className="grid grid-cols-[1fr_120px] items-center gap-2 text-[12px]">
                              <label className="font-bold">{field.label}</label>
                              <input
                                type="number"
                                step="any"
                                value={formulaSettings[field.key]}
                                onChange={(e) => updateFormulaSetting(field.key, e.target.value)}
                                className={adminFieldClasses}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {adminError && <div className="text-[12px] font-bold text-[#1F4E79]">{adminError}</div>}
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveFormulaSettings} className={`${buttonClasses} mt-0 max-w-[150px] py-1.5`}>
                    Save
                  </button>
                  <button onClick={resetFormulaSettings} className={`${buttonClasses} mt-0 max-w-[150px] py-1.5`}>
                    Reset
                  </button>
                  <button onClick={closeAdminPanel} className={`${buttonClasses} mt-0 max-w-[150px] py-1.5`}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isHelpOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1F2F3A]/45 p-3">
          <div className="w-full max-w-[760px] max-h-[88vh] overflow-auto border border-[#5F7789] bg-[#D8E4EC] shadow-[0_8px_24px_rgba(20,35,48,0.38)]">
            <div className="flex items-center justify-between bg-gradient-to-b from-[#6F95B0] via-[#4E7898] to-[#2F5F84] px-2 py-1 text-white border-b border-[#244C69]">
              <div className="text-[13px] font-bold">HDL PLANNING - HELP</div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="h-6 px-2 bg-gradient-to-b from-[#EEF4F8] to-[#BFD3E1] text-[#1F2F3A] border border-[#6F8798] text-[11px] font-bold"
              >
                X
              </button>
            </div>
            <div className="m-3 border border-[#8FA7B8] bg-[#EEF4F8] p-3 text-[12px] leading-relaxed shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
              <h2 className="mb-3 bg-gradient-to-b from-[#DCE8F0] to-[#B8CCD9] border border-[#8FA7B8] px-2 py-1 text-[13px] font-bold text-[#1F2F3A]">
                HDL Planning - Enterprise Planning Console
              </h2>
              <p className="mb-3">
                HDL Planning is a professional textile production planning and calculation platform designed for weaving and fabric manufacturing industries. The system helps production planners, merchandisers, and textile engineers calculate yarn consumption, forecast production stages, and estimate loom output efficiently through a clean and interactive dashboard.
              </p>
              <p className="mb-3">
                The platform includes dedicated modules for Warp Calculation and Weft Calculation, where users can input yarn count, ratio, ends, PPI, RS, and fabric length to automatically calculate yarn weight and process losses. It also features a Production Forecast section that estimates production quantities for different stages including Warping, Dyeing, Sizing, Weaving, Finishing, and Inspection.
              </p>
              <p className="mb-3">
                Additionally, the integrated Loom Production Calculator allows users to calculate loom production based on RPM, pick, and working days, helping improve planning accuracy and production efficiency.
              </p>
              <div className="mb-2 bg-gradient-to-b from-[#DCE8F0] to-[#B8CCD9] border border-[#8FA7B8] px-2 py-1 text-[12px] font-bold text-[#1F2F3A]">
                Key Features:
              </div>
              <ul className="mb-3 list-disc pl-5">
                <li>Warp yarn consumption calculation</li>
                <li>Weft yarn consumption calculation</li>
                <li>Automatic production forecasting</li>
                <li>Loom production estimation</li>
                <li>User-friendly enterprise dashboard</li>
                <li>Accurate textile planning support</li>
                <li>Professional industrial interface</li>
              </ul>
              <p>
                HDL Planning is built to simplify textile production planning, reduce manual calculation errors, and improve operational decision-making for modern textile manufacturing environments.
              </p>
            </div>
            <div className="m-3 mt-0 flex justify-end">
              <button onClick={() => setIsHelpOpen(false)} className={`${buttonClasses} mt-0 max-w-[130px] py-1.5`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[#1F2F3A]/45 p-3">
          <div className="w-full max-w-[840px] max-h-[88vh] overflow-hidden border border-[#5F7789] bg-[#D8E4EC] shadow-[0_8px_24px_rgba(20,35,48,0.38)]">
            <div className="flex items-center justify-between bg-gradient-to-b from-[#6F95B0] via-[#4E7898] to-[#2F5F84] px-2 py-1 text-white border-b border-[#244C69]">
              <div className="text-[13px] font-bold">TEXTILE TERM SEARCH</div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="h-6 px-2 bg-gradient-to-b from-[#EEF4F8] to-[#BFD3E1] text-[#1F2F3A] border border-[#6F8798] text-[11px] font-bold"
              >
                X
              </button>
            </div>
            <div className="grid max-h-[78vh] grid-cols-[250px_1fr] gap-3 overflow-hidden p-3 max-md:grid-cols-1">
              <div className="min-h-0 border border-[#8FA7B8] bg-[#EEF4F8] shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
                <div className="bg-gradient-to-b from-[#DCE8F0] to-[#B8CCD9] border-b border-[#8FA7B8] px-2 py-1 text-[12px] font-bold text-[#1F2F3A]">
                  Titles
                </div>
                <div className="max-h-[64vh] overflow-auto p-1">
                  {glossaryItems.map((item, index) => (
                    <button
                      key={item.title}
                      onClick={() => setSelectedGlossaryIndex(index)}
                      className={`block w-full border px-2 py-1 text-left text-[12px] font-bold ${
                        selectedGlossaryIndex === index
                          ? "border-[#6F8798] bg-[#FFF7C8] text-[#1F2F3A]"
                          : "border-transparent bg-transparent text-[#1F4E79] hover:border-[#8FA7B8] hover:bg-[#DCE8F0]"
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-[#8FA7B8] bg-[#EEF4F8] shadow-[inset_1px_1px_0_rgba(255,255,255,0.9)]">
                <div className="bg-gradient-to-b from-[#DCE8F0] to-[#B8CCD9] border-b border-[#8FA7B8] px-2 py-1 text-[12px] font-bold text-[#1F2F3A]">
                  Description
                </div>
                <div className="p-3">
                  <h2 className="mb-3 border border-[#8FA7B8] bg-[#FFF7C8] px-2 py-1 text-[14px] font-bold text-[#1F2F3A]">
                    {selectedGlossaryItem.title}
                  </h2>
                  <p className="border border-[#BFD3E1] bg-[#F7FAFC] p-3 text-[13px] leading-relaxed text-[#1F2F3A]">
                    {selectedGlossaryItem.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-[#8FA7B8] bg-[#C7D8E4] p-2">
              <button onClick={() => setIsSearchOpen(false)} className={`${buttonClasses} mt-0 max-w-[130px] py-1.5`}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="hdl-print-footer p-4 text-center opacity-85 text-[11px]">
        <p className="mb-2">
          &copy; {new Date().getFullYear()} <span className="font-semibold">Asif</span>. All Rights Reserved.
        </p>
        <div className="flex justify-center gap-2 mt-2">
          <a
            href="https://facebook.com/asif.j30"
            target="_blank"
            rel="noopener noreferrer"
            className="text-current text-xl hover:text-[#2F5F84] transition-colors"
            aria-label="Facebook"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          <a
            href="https://instagram.com/resetasif"
            target="_blank"
            rel="noopener noreferrer"
            className="text-current text-xl hover:text-[#2F5F84] transition-colors"
            aria-label="Instagram"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
          <a
            href="https://x.com/asifonwork"
            target="_blank"
            rel="noopener noreferrer"
            className="text-current text-xl hover:text-[#2F5F84] transition-colors"
            aria-label="X (Twitter)"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a
            href="https://github.com/asifhdlplan"
            target="_blank"
            rel="noopener noreferrer"
            className="text-current text-xl hover:text-[#2F5F84] transition-colors"
            aria-label="GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </footer>

      {/* WhatsApp Button */}
      <a
        href="https://wa.me/+8801748460707"
        target="_blank"
        rel="noopener noreferrer"
        className="no-print fixed bottom-4 right-4 bg-gradient-to-b from-[#EEF4F8] to-[#BFD3E1] hover:from-[#FFF7C8] hover:to-[#D6E4EE] text-[#1F2F3A] w-11 h-11 border border-[#6F8798] flex items-center justify-center text-xl shadow-[inset_1px_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(40,55,68,0.24)] transition-colors"
        aria-label="Contact on WhatsApp"
      >
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </div>
  )
}
