// Script rápido para probar asignación rotativo + interpretar fichadas
const today = new Date()
const toLocalISODate = (d) => d.toISOString().slice(0,10)
const parseLocalDate = (s) => {
  const [y,m,d] = s.split('-').map(Number)
  return new Date(y,m-1,d)
}
const parseTimeToMinutes = (time) => {
  const [h,m] = String(time).split(':').map(Number)
  return (Number.isFinite(h)?h:0)*60 + (Number.isFinite(m)?m:0)
}

const turnos = [
  {
    id: 't5',
    nombre: 'Rotativo Semana',
    tipo: 'rotativo',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    configuracionesDiarias: [
      { dia: 1, horaEntrada: '08:00', horaSalida: '16:00'},
      { dia: 2, horaEntrada: '08:00', horaSalida: '16:00'},
      { dia: 3, horaEntrada: '14:00', horaSalida: '22:00'},
      { dia: 4, horaEntrada: '14:00', horaSalida: '22:00'},
      { dia: 5, horaEntrada: '22:00', horaSalida: '06:00'},
    ]
  },
  {
    id: 't1',
    nombre: 'Mañana',
    tipo: 'fijo',
    horaEntrada: '08:00',
    horaSalida: '16:00'
  }
]

const employee = {
  id: 'e1',
  nombre: 'Test',
  apellido: 'User',
  turnoRotativo: { turnos: ['t5'], semanaActual: 0 }
}

const fecha = toLocalISODate(today)
const diaSemana = new Date().getDay()
console.log('Hoy:', fecha, 'díaSemana:', diaSemana)

// Crear fichadas: entrada tardía a las 09:10 y salida a 17:30
const fichadaEntrada = { empleadoId: employee.id, tipo: 'entrada', fecha, hora: '09:10' }
const fichadaSalida = { empleadoId: employee.id, tipo: 'salida', fecha, hora: '17:30' }

const fichadas = [fichadaEntrada, fichadaSalida]

function interpretar(fichada, fichadasAll, employees, turnos) {
  const emp = employees.find(e => e.id === fichada.empleadoId)
  let esTardanza = false
  let minutosExtra = 0
  const fechaFichada = parseLocalDate(fichada.fecha)
  let turno = null
  if (emp?.turnoId) turno = turnos.find(t => t.id === emp.turnoId)
  if (!turno && emp?.turnoRotativo && emp.turnoRotativo.turnos.length>0) {
    const dia = fechaFichada.getDay()
    for (const tid of emp.turnoRotativo.turnos) {
      const t = turnos.find(x=>x.id===tid)
      if (!t) continue
      const fStart = t.fechaInicio?parseLocalDate(t.fechaInicio):null
      const fEnd = t.fechaFin?parseLocalDate(t.fechaFin):null
      const esVal = (!fStart || fechaFichada>=fStart) && (!fEnd || fechaFichada<=fEnd)
      if (!esVal) continue
      if (t.tipo==='rotativo' && t.configuracionesDiarias?.some(c=>c.dia===dia)) { turno = t; break }
      if (t.tipo==='fijo' && t.diasSemana?.includes(dia)) { turno = t; break }
      if (t.tipo==='flexible' || t.tipo==='reducida') { turno = t; break }
    }
  }
  if (!turno) return { ...fichada, esTardanza, minutosExtra }

  let horaEntradaTurno, horaSalidaTurno
  if (turno.tipo==='fijo' || turno.tipo==='reducida') { horaEntradaTurno=turno.horaEntrada; horaSalidaTurno=turno.horaSalida }
  else if (turno.tipo==='rotativo' && turno.configuracionesDiarias) {
    const config = turno.configuracionesDiarias.find(c=>c.dia===fechaFichada.getDay())
    if (config) { horaEntradaTurno=config.horaEntrada; horaSalidaTurno=config.horaSalida }
  }
  if (!horaEntradaTurno || !horaSalidaTurno) return { ...fichada, esTardanza, minutosExtra }

  const toleranciaEntrada = turno.toleranciaEntradaMinutos||turno.toleranciaMinutos||0
  const toleranciaSalida = turno.toleranciaSalidaMinutos||turno.toleranciaMinutos||0

  if (fichada.tipo==='entrada') {
    const turnoMin = parseTimeToMinutes(horaEntradaTurno) + toleranciaEntrada
    const fichMin = parseTimeToMinutes(fichada.hora)
    esTardanza = fichMin > turnoMin
  } else if (fichada.tipo==='salida') {
    const turnoMin = parseTimeToMinutes(horaSalidaTurno) + toleranciaSalida
    const fichMin = parseTimeToMinutes(fichada.hora)
    minutosExtra = Math.max(0, fichMin - turnoMin)
  }
  return { ...fichada, esTardanza, minutosExtra }
}

console.log('Turnos disponibles:', turnos.map(t=>t.id))
const eInt = interpretar(fichadaEntrada, fichadas, [employee], turnos)
const sInt = interpretar(fichadaSalida, fichadas, [employee], turnos)
console.log('Entrada interpretada:', eInt)
console.log('Salida interpretada:', sInt)

// Determinar si se generarían novedades
const novedades = []
if (eInt.esTardanza && fichadaEntrada.tipo==='entrada') {
  novedades.push({ tipo: 'tardanza', fecha, descripcion: `Llegada tarde a ${fichadaEntrada.hora}`, estado: 'pendiente' })
}
if (sInt.minutosExtra && sInt.minutosExtra>0 && fichadaSalida.tipo==='salida') {
  novedades.push({ tipo: 'horaExtra', fecha, descripcion: `Minutos extra: ${sInt.minutosExtra}`, estado: 'pendiente' })
}
console.log('Novedades generadas:', novedades)
