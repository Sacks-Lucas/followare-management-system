export const parseLocalDate = (fecha: string): Date => {
  const [year, month, day] = fecha.split("-").map((value) => Number(value))
  return new Date(year, month - 1, day)
}

export const toLocalISODate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const todayLocalISODate = (): string => toLocalISODate(new Date())
