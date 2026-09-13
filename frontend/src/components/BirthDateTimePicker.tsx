"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface BirthDateTimePickerProps {
  dateValue: string; // YYYY-MM-DD
  timeValue: string; // HH:MM (24-hour format)
  onDateChange: (val: string) => void;
  onTimeChange: (val: string) => void;
}

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_HI = [
  "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

export default function BirthDateTimePicker({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
}: BirthDateTimePickerProps) {
  const { locale } = useI18n();
  const months = locale === "hi" ? MONTHS_HI : MONTHS_EN;

  // Internal local states allowing empty string while typing
  const [yearStr, setYearStr] = useState("1995");
  const [monthStr, setMonthStr] = useState("01");
  const [dayStr, setDayStr] = useState("01");

  const [is12HourMode, setIs12HourMode] = useState(false);
  const [hourStr, setHourStr] = useState("08");
  const [minuteStr, setMinuteStr] = useState("00");
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  // Track the last values emitted to parent to prevent re-entrant echo loops
  const lastEmittedDateRef = useRef("");
  const lastEmittedTimeRef = useRef("");

  // Sync internal state with props ONLY when changed externally
  useEffect(() => {
    if (dateValue && dateValue === lastEmittedDateRef.current) {
      return; // Skip re-entrant loop triggered by self
    }
    if (dateValue && dateValue.includes("-")) {
      const parts = dateValue.split("-");
      if (parts.length === 3) {
        setYearStr(parts[0]);
        setMonthStr(parts[1].padStart(2, "0"));
        setDayStr(parts[2].padStart(2, "0"));
      }
    }
  }, [dateValue]);

  useEffect(() => {
    if (timeValue && timeValue === lastEmittedTimeRef.current) {
      return; // Skip re-entrant loop triggered by self
    }
    if (timeValue && timeValue.includes(":")) {
      const [h, m] = timeValue.split(":");
      const numH = parseInt(h, 10);
      if (!isNaN(numH)) {
        if (is12HourMode) {
          const p = numH >= 12 ? "PM" : "AM";
          const h12 = numH === 0 ? 12 : numH > 12 ? numH - 12 : numH;
          setHourStr(String(h12).padStart(2, "0"));
          setPeriod(p);
        } else {
          setHourStr(h.padStart(2, "0"));
        }
        setMinuteStr((m || "00").padStart(2, "0"));
      }
    }
  }, [timeValue, is12HourMode]);

  // Year list from current down to 1920
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear; y >= 1920; y--) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  // Emit formatted date YYYY-MM-DD only when complete & valid
  function emitDate(y: string, m: string, d: string) {
    const cleanY = y.trim();
    const cleanM = m.trim();
    const cleanD = d.trim();
    if (cleanY.length === 4 && cleanM.length > 0 && cleanD.length > 0) {
      const numD = parseInt(cleanD, 10);
      if (!isNaN(numD) && numD >= 1 && numD <= 31) {
        const formattedD = String(numD).padStart(2, "0");
        const formattedM = cleanM.padStart(2, "0");
        const fullDate = `${cleanY}-${formattedM}-${formattedD}`;
        lastEmittedDateRef.current = fullDate;
        onDateChange(fullDate);
      }
    }
  }

  // Emit formatted time HH:MM (24-hour) only when complete
  function emitTime(h: string, m: string, p: "AM" | "PM", mode12: boolean) {
    if (h.trim() === "" || m.trim() === "") return; // Don't emit incomplete inputs
    let numH = parseInt(h, 10);
    let numM = parseInt(m, 10);
    if (isNaN(numH) || isNaN(numM)) return;

    numM = Math.min(59, Math.max(0, numM));
    const cleanM = String(numM).padStart(2, "0");

    let finalH = 0;
    if (mode12) {
      if (numH > 12) numH = 12;
      if (numH < 1) numH = 12;
      finalH = numH;
      if (p === "PM" && numH !== 12) finalH = numH + 12;
      if (p === "AM" && numH === 12) finalH = 0;
    } else {
      finalH = Math.min(23, Math.max(0, numH));
    }
    const formattedTime = `${String(finalH).padStart(2, "0")}:${cleanM}`;
    lastEmittedTimeRef.current = formattedTime;
    onTimeChange(formattedTime);
  }

  // Element refs for keyboard jump
  const monthRef = useRef<HTMLSelectElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const minRef = useRef<HTMLInputElement>(null);

  const inputStyle =
    "w-full rounded-lg border border-goldline bg-panel px-2.5 py-2 text-center text-sm font-semibold tabular-nums outline-none transition focus:border-saffron-600 focus:ring-2 focus:ring-saffron-100";

  return (
    <div className="space-y-4">
      {/* Date Picker Section */}
      <div className="rounded-xl border border-goldline bg-panel/70 p-3.5 shadow-sm sm:p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-saffron-700">
            <Calendar size={14} />
            {locale === "hi" ? "जन्म तिथि" : "Date of Birth"}
          </label>
          <span className="text-[11px] font-medium text-stone-500">
            {locale === "hi" ? "दिन · माह · वर्ष सीधे टाइप करें" : "Direct typing: Day · Month · Year"}
          </span>
        </div>

        <div className="grid grid-cols-12 gap-2">
          {/* Day */}
          <div className="col-span-3 sm:col-span-3">
            <label className="mb-1 block text-[10px] font-bold text-stone-600">
              {locale === "hi" ? "दिन (DD)" : "Day (DD)"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="01"
              value={dayStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                setDayStr(val);
                if (val !== "") {
                  emitDate(yearStr, monthStr, val);
                  if (val.length === 2 && monthRef.current) {
                    monthRef.current.focus();
                  }
                }
              }}
              onBlur={() => {
                if (!dayStr) {
                  setDayStr("01");
                  emitDate(yearStr, monthStr, "01");
                } else {
                  const num = Math.min(31, Math.max(1, parseInt(dayStr, 10) || 1));
                  const padded = String(num).padStart(2, "0");
                  setDayStr(padded);
                  emitDate(yearStr, monthStr, padded);
                }
              }}
              className={inputStyle}
              aria-label="Day"
            />
          </div>

          {/* Month Selector */}
          <div className="col-span-4 sm:col-span-4">
            <label className="mb-1 block text-[10px] font-bold text-stone-600">
              {locale === "hi" ? "माह (MM)" : "Month"}
            </label>
            <select
              ref={monthRef}
              value={monthStr}
              onChange={(e) => {
                const val = e.target.value;
                setMonthStr(val);
                emitDate(yearStr, val, dayStr || "01");
                if (yearRef.current) yearRef.current.focus();
              }}
              className={`${inputStyle} text-left px-2`}
              aria-label="Month"
            >
              {months.map((m, idx) => {
                const numVal = String(idx + 1).padStart(2, "0");
                return (
                  <option key={numVal} value={numVal}>
                    {numVal} - {m}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Year Direct Typing + Select */}
          <div className="col-span-5 sm:col-span-5">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px] font-bold text-stone-600">
                {locale === "hi" ? "वर्ष (YYYY)" : "Year (YYYY)"}
              </label>
              <select
                value={yearStr}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setYearStr(val);
                    emitDate(val, monthStr, dayStr || "01");
                  }
                }}
                className="text-[10px] text-saffron-700 bg-transparent border-0 font-bold cursor-pointer hover:underline"
                aria-label="Quick pick year"
              >
                <option value="">{locale === "hi" ? "सूची..." : "Pick..."}</option>
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <input
              ref={yearRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="1995"
              value={yearStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setYearStr(val);
                if (val.length === 4) {
                  emitDate(val, monthStr, dayStr || "01");
                }
              }}
              onBlur={() => {
                if (yearStr.length < 4) {
                  const fallbackYear = String(new Date().getFullYear() - 30);
                  setYearStr(fallbackYear);
                  emitDate(fallbackYear, monthStr, dayStr || "01");
                }
              }}
              className={inputStyle}
              aria-label="Year"
            />
          </div>
        </div>

        {/* Formatted Date preview badge */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-500">
          <span>
            {locale === "hi" ? "चयनित:" : "Formatted:"}{" "}
            <strong className="font-semibold text-saffron-800">
              {(dayStr || "01").padStart(2, "0")} / {monthStr} / {yearStr || "1995"}
            </strong>
          </span>
          <label className="cursor-pointer text-xs font-semibold text-saffron-700 hover:underline">
            {locale === "hi" ? "कैलेंडर से चुनें" : "Open Calendar"}
            <input
              type="date"
              value={dateValue}
              onChange={(e) => {
                if (e.target.value) {
                  lastEmittedDateRef.current = e.target.value;
                  onDateChange(e.target.value);
                }
              }}
              className="sr-only"
            />
          </label>
        </div>
      </div>

      {/* Time Picker Section */}
      <div className="rounded-xl border border-goldline bg-panel/70 p-3.5 shadow-sm sm:p-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-saffron-700">
            <Clock size={14} />
            {locale === "hi" ? "जन्म समय" : "Time of Birth"}
          </label>

          {/* Mode Switch: 24-Hour vs 12-Hour */}
          <div className="flex rounded-lg border border-goldline bg-panel p-0.5 text-xs">
            <button
              type="button"
              onClick={() => {
                if (is12HourMode) {
                  setIs12HourMode(false);
                  const numH = parseInt(hourStr || "0", 10);
                  let h24 = numH;
                  if (period === "PM" && numH !== 12) h24 = numH + 12;
                  if (period === "AM" && numH === 12) h24 = 0;
                  const paddedH = String(h24).padStart(2, "0");
                  setHourStr(paddedH);
                  emitTime(paddedH, minuteStr || "00", period, false);
                }
              }}
              className={`rounded-md px-2.5 py-1 font-bold transition ${
                !is12HourMode
                  ? "bg-saffron-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-saffron-100"
              }`}
            >
              24h
            </button>
            <button
              type="button"
              onClick={() => {
                if (!is12HourMode) {
                  setIs12HourMode(true);
                  const numH = parseInt(hourStr || "0", 10);
                  const p = numH >= 12 ? "PM" : "AM";
                  const h12 = numH === 0 ? 12 : numH > 12 ? numH - 12 : numH;
                  const paddedH = String(h12).padStart(2, "0");
                  setHourStr(paddedH);
                  setPeriod(p);
                  emitTime(paddedH, minuteStr || "00", p, true);
                }
              }}
              className={`rounded-md px-2.5 py-1 font-bold transition ${
                is12HourMode
                  ? "bg-saffron-600 text-white shadow-sm"
                  : "text-stone-600 hover:bg-saffron-100"
              }`}
            >
              12h (AM/PM)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hours Input */}
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold text-stone-600">
              {is12HourMode
                ? locale === "hi" ? "घंटे (01-12)" : "Hour (01-12)"
                : locale === "hi" ? "घंटे (00-23)" : "Hour (00-23)"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder={is12HourMode ? "08" : "14"}
              value={hourStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                setHourStr(val);
                if (val !== "") {
                  emitTime(val, minuteStr || "00", period, is12HourMode);
                  if (val.length === 2 && minRef.current) {
                    minRef.current.focus();
                  }
                }
              }}
              onBlur={() => {
                if (!hourStr) {
                  const defaultH = is12HourMode ? "12" : "08";
                  setHourStr(defaultH);
                  emitTime(defaultH, minuteStr || "00", period, is12HourMode);
                } else {
                  let num = parseInt(hourStr, 10);
                  if (isNaN(num)) num = is12HourMode ? 12 : 8;
                  if (is12HourMode) {
                    num = Math.min(12, Math.max(1, num));
                  } else {
                    num = Math.min(23, Math.max(0, num));
                  }
                  const padded = String(num).padStart(2, "0");
                  setHourStr(padded);
                  emitTime(padded, minuteStr || "00", period, is12HourMode);
                }
              }}
              className={inputStyle}
              aria-label="Hours"
            />
          </div>

          <span className="mt-4 text-xl font-bold text-stone-400">:</span>

          {/* Minutes Input */}
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-bold text-stone-600">
              {locale === "hi" ? "मिनट (00-59)" : "Minute (00-59)"}
            </label>
            <input
              ref={minRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              placeholder="30"
              value={minuteStr}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                setMinuteStr(val);
                if (val !== "") {
                  emitTime(hourStr || (is12HourMode ? "12" : "08"), val, period, is12HourMode);
                }
              }}
              onBlur={() => {
                if (!minuteStr) {
                  setMinuteStr("00");
                  emitTime(hourStr || (is12HourMode ? "12" : "08"), "00", period, is12HourMode);
                } else {
                  const num = Math.min(59, Math.max(0, parseInt(minuteStr, 10) || 0));
                  const padded = String(num).padStart(2, "0");
                  setMinuteStr(padded);
                  emitTime(hourStr || (is12HourMode ? "12" : "08"), padded, period, is12HourMode);
                }
              }}
              className={inputStyle}
              aria-label="Minutes"
            />
          </div>

          {/* AM / PM Toggle with High-Contrast Pill (Only in 12h mode) */}
          {is12HourMode && (
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold text-stone-600">
                {locale === "hi" ? "पहर" : "Period"}
              </label>
              <div className="flex rounded-lg border border-goldline bg-panel p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setPeriod("AM");
                    emitTime(hourStr || "12", minuteStr || "00", "AM", true);
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-bold transition ${
                    period === "AM"
                      ? "bg-saffron-600 text-white shadow-sm ring-1 ring-saffron-700"
                      : "text-stone-600 hover:bg-saffron-100"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPeriod("PM");
                    emitTime(hourStr || "12", minuteStr || "00", "PM", true);
                  }}
                  className={`flex-1 rounded-md py-2 text-xs font-bold transition ${
                    period === "PM"
                      ? "bg-saffron-600 text-white shadow-sm ring-1 ring-saffron-700"
                      : "text-stone-600 hover:bg-saffron-100"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 24-Hour Standard Time Output Info */}
        <div className="mt-2 flex items-center justify-between text-[11px] text-stone-500">
          <span>
            {locale === "hi" ? "मानक 24-घंटे समय:" : "Internal 24h format:"}{" "}
            <strong className="font-semibold text-saffron-800">{timeValue || "00:00"}</strong>
          </span>
          <span className="text-[10px] text-stone-400">
            {locale === "hi" ? "सटीक कुंडली हेतु आवश्यक" : "Used for astronomical precision"}
          </span>
        </div>
      </div>
    </div>
  );
}
