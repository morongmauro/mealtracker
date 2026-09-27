// /api/_musculos.js
// Músculos (principales y secundarios) de los ejercicios de fuerza de las
// rutinas cargadas, por nombre en inglés o en español. Es el mismo listado de
// entrenamientoecm/carga/musculos-ejercicios.sql.
//
// Sirve de RESPALDO: si en la base un ejercicio de fuerza todavía no tiene
// músculos (porque ese SQL no se ha corrido, o el ejercicio se creó a mano con
// el mismo nombre), la API los completa aquí y la ficha pinta la silueta
// igual. Lo que ya esté en la base manda siempre.
//
// El "_" delante hace que Vercel NO lo cuente como función (tope de 12).
export const MUSCULOS = {
"1/2 kneel to high knee hop": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gemelos",
"psoas"
]
],
"salto de rodilla alta desde media rodilla": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gemelos",
"psoas"
]
],
"1/2 kneel to lateral bound": [
[
"gluteo_mayor",
"gluteo_medio",
"cuadriceps"
],
[
"abductores",
"gemelos"
]
],
"salto lateral desde media rodilla": [
[
"gluteo_mayor",
"gluteo_medio",
"cuadriceps"
],
[
"abductores",
"gemelos"
]
],
"ab roller wheel abdominal roll out": [
[
"recto_abdominal",
"transverso"
],
[
"dorsal_ancho",
"oblicuos"
]
],
"rueda abdominal": [
[
"recto_abdominal",
"transverso"
],
[
"dorsal_ancho",
"oblicuos"
]
],
"alternating leg drop": [
[
"recto_abdominal",
"psoas"
],
[
"transverso"
]
],
"descenso alterno de pierna": [
[
"recto_abdominal",
"psoas"
],
[
"transverso"
]
],
"alternating lunge hops": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"saltos de zancada alternos": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"angled machine leg press": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"prensa inclinada": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"band anchored pistol squat to row": [
[
"cuadriceps",
"gluteo_mayor",
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"transverso"
]
],
"sentadilla a una pierna con remo en banda": [
[
"cuadriceps",
"gluteo_mayor",
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"transverso"
]
],
"band anchored single arm incline curl": [
[
"biceps"
],
[
"braquial"
]
],
"curl inclinado a una mano con banda": [
[
"biceps"
],
[
"braquial"
]
],
"band anchored single arm tricep kickback": [
[
"triceps"
],
[
"deltoide_posterior"
]
],
"patada de tríceps a una mano con banda": [
[
"triceps"
],
[
"deltoide_posterior"
]
],
"band deadlift": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"aductores"
]
],
"peso muerto con banda": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"aductores"
]
],
"bar hang": [
[
"antebrazo",
"dorsal_ancho"
],
[
"trapecio_inferior",
"transverso"
]
],
"colgarse de la barra": [
[
"antebrazo",
"dorsal_ancho"
],
[
"trapecio_inferior",
"transverso"
]
],
"barbell hip thrust": [
[
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"hip thrust con barra": [
[
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"barbell preacher curl": [
[
"biceps"
],
[
"braquial"
]
],
"curl predicador con barra": [
[
"biceps"
],
[
"braquial"
]
],
"barbell rear shrug": [
[
"trapecio_superior"
],
[
"trapecio_medio",
"antebrazo"
]
],
"encogimiento de hombros con barra por detrás": [
[
"trapecio_superior"
],
[
"trapecio_medio",
"antebrazo"
]
],
"barbell romanian deadlift": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"erectores",
"antebrazo"
]
],
"peso muerto rumano con barra": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"erectores",
"antebrazo"
]
],
"bench hip thrust": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"hip thrust en banco": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"bench hopover burpee": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"pectoral_mayor",
"deltoide_anterior",
"gemelos",
"recto_abdominal"
]
],
"burpee saltando el banco": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"pectoral_mayor",
"deltoide_anterior",
"gemelos",
"recto_abdominal"
]
],
"bench knee tuck to v up": [
[
"recto_abdominal",
"psoas"
],
[
"oblicuos"
]
],
"rodillas al pecho a v-up en banco": [
[
"recto_abdominal",
"psoas"
],
[
"oblicuos"
]
],
"bench plank single arm row": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"recto_abdominal",
"oblicuos",
"biceps"
]
],
"remo a una mano en plancha sobre banco": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"recto_abdominal",
"oblicuos",
"biceps"
]
],
"bench plyo push ups": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"flexiones pliométricas en banco": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"bench side plank hip dip": [
[
"oblicuos"
],
[
"recto_abdominal",
"gluteo_medio"
]
],
"plancha lateral en banco con descenso de cadera": [
[
"oblicuos"
],
[
"recto_abdominal",
"gluteo_medio"
]
],
"bench single leg hip thrust": [
[
"gluteo_mayor"
],
[
"isquiotibiales",
"gluteo_medio"
]
],
"hip thrust a una pierna en banco": [
[
"gluteo_mayor"
],
[
"isquiotibiales",
"gluteo_medio"
]
],
"bench twist crunches": [
[
"recto_abdominal",
"oblicuos"
],
[]
],
"crunch con giro en banco": [
[
"recto_abdominal",
"oblicuos"
],
[]
],
"bench v sit leg raise": [
[
"recto_abdominal",
"psoas"
],
[]
],
"elevación de piernas en v sobre banco": [
[
"recto_abdominal",
"psoas"
],
[]
],
"bicycle crunch": [
[
"recto_abdominal",
"oblicuos"
],
[
"psoas"
]
],
"bicicleta abdominal": [
[
"recto_abdominal",
"oblicuos"
],
[
"psoas"
]
],
"body weight calf raise": [
[
"gemelos"
],
[]
],
"elevación de talones sin carga": [
[
"gemelos"
],
[]
],
"body weight single leg deadlift": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"gluteo_medio",
"erectores"
]
],
"peso muerto a una pierna sin peso": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"gluteo_medio",
"erectores"
]
],
"bodyweight bent knee single leg calf raise": [
[
"gemelos"
],
[]
],
"gemelo a una pierna con rodilla flexionada": [
[
"gemelos"
],
[]
],
"bodyweight deadbug": [
[
"recto_abdominal",
"transverso"
],
[
"psoas"
]
],
"dead bug": [
[
"recto_abdominal",
"transverso"
],
[
"psoas"
]
],
"bodyweight deadlift": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores"
]
],
"peso muerto sin carga": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores"
]
],
"bodyweight single leg calf raise": [
[
"gemelos"
],
[]
],
"gemelo a una pierna sin peso": [
[
"gemelos"
],
[]
],
"bodyweight walking lunge": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores",
"gemelos"
]
],
"zancada caminando sin peso": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores",
"gemelos"
]
],
"bosu lateral bounce to squat jump": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gluteo_medio",
"abductores",
"gemelos"
]
],
"rebote lateral en bosu a salto": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gluteo_medio",
"abductores",
"gemelos"
]
],
"box jump": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"salto al cajón": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"box pistol squat": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gluteo_medio",
"gemelos"
]
],
"sentadilla a una pierna al cajón": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gluteo_medio",
"gemelos"
]
],
"broad jump": [
[
"gluteo_mayor",
"cuadriceps"
],
[
"isquiotibiales",
"gemelos"
]
],
"salto horizontal": [
[
"gluteo_mayor",
"cuadriceps"
],
[
"isquiotibiales",
"gemelos"
]
],
"bulgarian pulses": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"gluteo_medio"
]
],
"rebotes en búlgara": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"gluteo_medio"
]
],
"burpee": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"pectoral_mayor",
"deltoide_anterior",
"recto_abdominal"
]
],
"burpee broad jump": [
[
"gluteo_mayor",
"cuadriceps"
],
[
"isquiotibiales",
"gemelos",
"pectoral_mayor",
"deltoide_anterior"
]
],
"burpee con salto horizontal": [
[
"gluteo_mayor",
"cuadriceps"
],
[
"isquiotibiales",
"gemelos",
"pectoral_mayor",
"deltoide_anterior"
]
],
"cable bicep curl": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"curl de bíceps en polea": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"cable glute crossover kickback": [
[
"gluteo_mayor",
"gluteo_medio"
],
[
"abductores"
]
],
"patada de glúteo cruzada en polea": [
[
"gluteo_mayor",
"gluteo_medio"
],
[
"abductores"
]
],
"cable lateral raise": [
[
"deltoide_lateral"
],
[
"trapecio_superior"
]
],
"elevación lateral en polea": [
[
"deltoide_lateral"
],
[
"trapecio_superior"
]
],
"cable rope face pull": [
[
"deltoide_posterior",
"trapecio_medio"
],
[
"romboides",
"manguito_rotador",
"trapecio_superior"
]
],
"face pull con cuerda": [
[
"deltoide_posterior",
"trapecio_medio"
],
[
"romboides",
"manguito_rotador",
"trapecio_superior"
]
],
"cable seated close grip row": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"romboides",
"biceps",
"deltoide_posterior"
]
],
"remo sentado agarre cerrado en polea": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"romboides",
"biceps",
"deltoide_posterior"
]
],
"cable seated close row": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"romboides",
"biceps"
]
],
"remo sentado agarre estrecho en polea": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"romboides",
"biceps"
]
],
"cable seated wide grip row": [
[
"trapecio_medio",
"dorsal_ancho"
],
[
"deltoide_posterior",
"romboides",
"biceps"
]
],
"remo sentado agarre ancho en polea": [
[
"trapecio_medio",
"dorsal_ancho"
],
[
"deltoide_posterior",
"romboides",
"biceps"
]
],
"cable shrug": [
[
"trapecio_superior"
],
[
"trapecio_medio"
]
],
"encogimiento de trapecio en polea": [
[
"trapecio_superior"
],
[
"trapecio_medio"
]
],
"cable single arm bicep curl": [
[
"biceps"
],
[
"braquial"
]
],
"curl de bíceps a una mano en polea": [
[
"biceps"
],
[
"braquial"
]
],
"cable single arm standing overhead tricep extension": [
[
"triceps"
],
[]
],
"extensión de tríceps a una mano en polea": [
[
"triceps"
],
[]
],
"cable standing crossover chest fly": [
[
"pectoral_mayor"
],
[
"deltoide_anterior"
]
],
"cruce de poleas de pie": [
[
"pectoral_mayor"
],
[
"deltoide_anterior"
]
],
"cable straight bar tricep pushdown": [
[
"triceps"
],
[]
],
"extensión de tríceps con barra recta en polea": [
[
"triceps"
],
[]
],
"cable tricep kickback": [
[
"triceps"
],
[
"deltoide_posterior"
]
],
"patada de tríceps en polea": [
[
"triceps"
],
[
"deltoide_posterior"
]
],
"cable v bar tricep pushdown": [
[
"triceps"
],
[]
],
"extensión de tríceps en polea alta": [
[
"triceps"
],
[]
],
"cable v-bar overhead tricep extension": [
[
"triceps"
],
[]
],
"extensión de tríceps sobre la cabeza en polea": [
[
"triceps"
],
[]
],
"chest to wall handstand": [
[
"deltoide_anterior",
"triceps"
],
[
"trapecio_superior",
"recto_abdominal",
"transverso"
]
],
"pino de cara a la pared": [
[
"deltoide_anterior",
"triceps"
],
[
"trapecio_superior",
"recto_abdominal",
"transverso"
]
],
"clamshell with hip thrust": [
[
"gluteo_medio",
"gluteo_mayor"
],
[
"abductores",
"oblicuos"
]
],
"almeja con empuje de cadera": [
[
"gluteo_medio",
"gluteo_mayor"
],
[
"abductores",
"oblicuos"
]
],
"clapping push up": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"flexión con palmada": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"cross body mountain climber": [
[
"recto_abdominal",
"oblicuos"
],
[
"psoas",
"deltoide_anterior"
]
],
"escalador cruzado": [
[
"recto_abdominal",
"oblicuos"
],
[
"psoas",
"deltoide_anterior"
]
],
"decline plank to pike": [
[
"recto_abdominal",
"deltoide_anterior"
],
[
"transverso",
"triceps"
]
],
"plancha declinada a pica": [
[
"recto_abdominal",
"deltoide_anterior"
],
[
"transverso",
"triceps"
]
],
"dip": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"fondos en paralelas": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"dip machine bent leg raise": [
[
"recto_abdominal",
"psoas"
],
[
"oblicuos"
]
],
"elevación de rodillas en paralelas": [
[
"recto_abdominal",
"psoas"
],
[
"oblicuos"
]
],
"dip machine straight leg raise": [
[
"recto_abdominal",
"psoas"
],
[
"oblicuos"
]
],
"elevación de piernas rectas en paralelas": [
[
"recto_abdominal",
"psoas"
],
[
"oblicuos"
]
],
"dragon flag tuck eccentric": [
[
"recto_abdominal",
"transverso"
],
[
"dorsal_ancho",
"oblicuos"
]
],
"dragon flag agrupado excéntrico": [
[
"recto_abdominal",
"transverso"
],
[
"dorsal_ancho",
"oblicuos"
]
],
"dumbbell alternating bicep curl": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"curl de bíceps alterno": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"dumbbell alternating hammer curl": [
[
"braquial",
"biceps"
],
[
"antebrazo"
]
],
"curl martillo alterno": [
[
"braquial",
"biceps"
],
[
"antebrazo"
]
],
"dumbbell alternating lateral raise to front raise": [
[
"deltoide_lateral",
"deltoide_anterior"
],
[
"trapecio_superior"
]
],
"elevación lateral a frontal alterna": [
[
"deltoide_lateral",
"deltoide_anterior"
],
[
"trapecio_superior"
]
],
"dumbbell bench press": [
[
"pectoral_mayor"
],
[
"triceps",
"deltoide_anterior"
]
],
"press banca con mancuernas": [
[
"pectoral_mayor"
],
[
"triceps",
"deltoide_anterior"
]
],
"dumbbell bicep curl": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"curl de bíceps con mancuernas": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"dumbbell bulgarian split squat": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales",
"gluteo_medio"
]
],
"sentadilla búlgara con mancuernas": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales",
"gluteo_medio"
]
],
"dumbbell burpee clean to press": [
[
"cuadriceps",
"gluteo_mayor",
"deltoide_anterior"
],
[
"pectoral_mayor",
"triceps",
"isquiotibiales",
"trapecio_superior"
]
],
"burpee con cargada y press": [
[
"cuadriceps",
"gluteo_mayor",
"deltoide_anterior"
],
[
"pectoral_mayor",
"triceps",
"isquiotibiales",
"trapecio_superior"
]
],
"dumbbell burpee with curl to press": [
[
"cuadriceps",
"gluteo_mayor",
"deltoide_anterior"
],
[
"biceps",
"pectoral_mayor",
"triceps"
]
],
"burpee con curl y press": [
[
"cuadriceps",
"gluteo_mayor",
"deltoide_anterior"
],
[
"biceps",
"pectoral_mayor",
"triceps"
]
],
"dumbbell calf raise": [
[
"gemelos"
],
[]
],
"gemelo de pie con mancuerna": [
[
"gemelos"
],
[]
],
"dumbbell clean to press": [
[
"gluteo_mayor",
"isquiotibiales",
"deltoide_anterior"
],
[
"cuadriceps",
"trapecio_superior",
"triceps"
]
],
"cargada y press con mancuernas": [
[
"gluteo_mayor",
"isquiotibiales",
"deltoide_anterior"
],
[
"cuadriceps",
"trapecio_superior",
"triceps"
]
],
"dumbbell curl to shoulder press": [
[
"biceps",
"deltoide_anterior"
],
[
"deltoide_lateral",
"triceps"
]
],
"curl y press de hombro con mancuernas": [
[
"biceps",
"deltoide_anterior"
],
[
"deltoide_lateral",
"triceps"
]
],
"dumbbell deadlift": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"cuadriceps",
"antebrazo"
]
],
"peso muerto con mancuernas": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"cuadriceps",
"antebrazo"
]
],
"dumbbell floor press": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"press de pecho en suelo": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"dumbbell front squat": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"recto_abdominal",
"erectores"
]
],
"sentadilla frontal con mancuernas": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"recto_abdominal",
"erectores"
]
],
"dumbbell glute bridge": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"puente de glúteo con mancuerna": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"dumbbell glute bridge chest press": [
[
"pectoral_mayor",
"gluteo_mayor"
],
[
"triceps",
"isquiotibiales"
]
],
"press de pecho en puente de glúteo": [
[
"pectoral_mayor",
"gluteo_mayor"
],
[
"triceps",
"isquiotibiales"
]
],
"dumbbell hammer curl": [
[
"braquial",
"biceps"
],
[
"antebrazo"
]
],
"curl martillo con mancuernas": [
[
"braquial",
"biceps"
],
[
"antebrazo"
]
],
"dumbbell hip thrust": [
[
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"hip thrust con mancuerna": [
[
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"dumbbell incline alternating curl": [
[
"biceps"
],
[
"braquial"
]
],
"curl inclinado alterno": [
[
"biceps"
],
[
"braquial"
]
],
"dumbbell incline bench high row": [
[
"trapecio_medio",
"deltoide_posterior"
],
[
"romboides",
"trapecio_superior",
"biceps"
]
],
"remo alto en banco inclinado": [
[
"trapecio_medio",
"deltoide_posterior"
],
[
"romboides",
"trapecio_superior",
"biceps"
]
],
"dumbbell incline bench press": [
[
"pectoral_superior",
"deltoide_anterior"
],
[
"pectoral_mayor",
"triceps"
]
],
"press inclinado con mancuernas": [
[
"pectoral_superior",
"deltoide_anterior"
],
[
"pectoral_mayor",
"triceps"
]
],
"dumbbell incline bicep curl": [
[
"biceps"
],
[
"braquial"
]
],
"curl inclinado con mancuernas": [
[
"biceps"
],
[
"braquial"
]
],
"dumbbell isometric bicep curl": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"curl isométrico con mancuernas": [
[
"biceps"
],
[
"braquial",
"antebrazo"
]
],
"dumbbell lateral raise": [
[
"deltoide_lateral"
],
[
"trapecio_superior",
"deltoide_anterior"
]
],
"elevación lateral con mancuernas": [
[
"deltoide_lateral"
],
[
"trapecio_superior",
"deltoide_anterior"
]
],
"dumbbell laying tricep extension to press": [
[
"triceps"
],
[
"pectoral_mayor",
"deltoide_anterior"
]
],
"extensión de tríceps tumbado a press": [
[
"triceps"
],
[
"pectoral_mayor",
"deltoide_anterior"
]
],
"dumbbell reverse lunge": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"zancada atrás con mancuernas": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"dumbbell seated arnold press": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior",
"deltoide_posterior"
]
],
"press arnold sentado": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior",
"deltoide_posterior"
]
],
"dumbbell seated front raise": [
[
"deltoide_anterior"
],
[
"deltoide_lateral",
"pectoral_superior"
]
],
"elevación frontal sentado": [
[
"deltoide_anterior"
],
[
"deltoide_lateral",
"pectoral_superior"
]
],
"dumbbell seated overhead tricep extension": [
[
"triceps"
],
[]
],
"extensión de tríceps sobre la cabeza sentado": [
[
"triceps"
],
[]
],
"dumbbell seated shoulder press": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior"
]
],
"press de hombro sentado con mancuernas": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior"
]
],
"dumbbell shrug": [
[
"trapecio_superior"
],
[
"trapecio_medio",
"antebrazo"
]
],
"encogimiento de trapecio con mancuernas": [
[
"trapecio_superior"
],
[
"trapecio_medio",
"antebrazo"
]
],
"dumbbell single arm row": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"biceps",
"deltoide_posterior",
"romboides"
]
],
"remo a una mano con mancuerna": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"biceps",
"deltoide_posterior",
"romboides"
]
],
"dumbbell single leg calf raise": [
[
"gemelos"
],
[]
],
"elevación de talón a una pierna con mancuerna": [
[
"gemelos"
],
[]
],
"dumbbell stationary lunge": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"zancada estática con mancuernas": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"dumbbell straight leg deadlift": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"erectores"
]
],
"peso muerto piernas rectas con mancuernas": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"erectores"
]
],
"dumbbell sumo deadlift": [
[
"gluteo_mayor",
"aductores"
],
[
"isquiotibiales",
"cuadriceps",
"erectores"
]
],
"peso muerto sumo con mancuerna": [
[
"gluteo_mayor",
"aductores"
],
[
"isquiotibiales",
"cuadriceps",
"erectores"
]
],
"dumbbell walking lunge": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales",
"gemelos"
]
],
"zancada caminando con mancuernas": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales",
"gemelos"
]
],
"ez bar preacher curl": [
[
"biceps"
],
[
"braquial"
]
],
"curl predicador con barra z": [
[
"biceps"
],
[
"braquial"
]
],
"elevated pike push-up": [
[
"deltoide_anterior",
"triceps"
],
[
"trapecio_superior",
"pectoral_superior",
"recto_abdominal"
]
],
"flexión en pica con pies elevados": [
[
"deltoide_anterior",
"triceps"
],
[
"trapecio_superior",
"pectoral_superior",
"recto_abdominal"
]
],
"glute bridge": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"puente de glúteo": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"half burpee with dumbbell": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"pectoral_mayor",
"deltoide_anterior",
"erectores"
]
],
"medio burpee con mancuernas": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"pectoral_mayor",
"deltoide_anterior",
"erectores"
]
],
"half kneeling superband single arm row": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"biceps",
"deltoide_posterior",
"oblicuos"
]
],
"remo a una mano con banda de rodillas": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"biceps",
"deltoide_posterior",
"oblicuos"
]
],
"high plank jacks": [
[
"recto_abdominal",
"abductores"
],
[
"deltoide_anterior",
"gemelos"
]
],
"plancha alta con saltos": [
[
"recto_abdominal",
"abductores"
],
[
"deltoide_anterior",
"gemelos"
]
],
"hip thrust machine": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"hip thrust en máquina": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"hollow body hold flutter kicks": [
[
"recto_abdominal",
"psoas"
],
[
"transverso"
]
],
"hollow hold con tijeras": [
[
"recto_abdominal",
"psoas"
],
[
"transverso"
]
],
"horizontal cable rotation": [
[
"oblicuos"
],
[
"recto_abdominal",
"transverso"
]
],
"rotación horizontal en polea": [
[
"oblicuos"
],
[
"recto_abdominal",
"transverso"
]
],
"jump squat to reverse lunge": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"sentadilla con salto a zancada atrás": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"kettlebell alternating bent over row": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"deltoide_posterior",
"biceps",
"erectores"
]
],
"remo inclinado alterno con kettlebell": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"deltoide_posterior",
"biceps",
"erectores"
]
],
"kettlebell alternating halo with chest press": [
[
"pectoral_mayor",
"deltoide_anterior"
],
[
"recto_abdominal",
"triceps",
"oblicuos"
]
],
"halo alterno con press de pecho (kettlebell)": [
[
"pectoral_mayor",
"deltoide_anterior"
],
[
"recto_abdominal",
"triceps",
"oblicuos"
]
],
"kettlebell alternating press": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior"
]
],
"press alterno con kettlebell": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior"
]
],
"kettlebell alternating stationary cossack squat": [
[
"cuadriceps",
"gluteo_mayor",
"aductores"
],
[
"isquiotibiales",
"abductores"
]
],
"sentadilla cosaco alterna con kettlebell": [
[
"cuadriceps",
"gluteo_mayor",
"aductores"
],
[
"isquiotibiales",
"abductores"
]
],
"kettlebell high pull": [
[
"trapecio_superior",
"deltoide_lateral"
],
[
"gluteo_mayor",
"isquiotibiales",
"deltoide_posterior"
]
],
"cargada alta con kettlebell": [
[
"trapecio_superior",
"deltoide_lateral"
],
[
"gluteo_mayor",
"isquiotibiales",
"deltoide_posterior"
]
],
"kettlebell lateral step up": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gluteo_medio",
"abductores",
"isquiotibiales"
]
],
"subida lateral al cajón con kettlebell": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"gluteo_medio",
"abductores",
"isquiotibiales"
]
],
"kettlebell single arm clean and press": [
[
"gluteo_mayor",
"deltoide_anterior"
],
[
"isquiotibiales",
"cuadriceps",
"triceps",
"trapecio_superior"
]
],
"cargada y press a una mano con kettlebell": [
[
"gluteo_mayor",
"deltoide_anterior"
],
[
"isquiotibiales",
"cuadriceps",
"triceps",
"trapecio_superior"
]
],
"knee to elbow crunch": [
[
"recto_abdominal",
"oblicuos"
],
[
"psoas"
]
],
"crunch rodilla al codo": [
[
"recto_abdominal",
"oblicuos"
],
[
"psoas"
]
],
"landmine deadlift": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"cuadriceps"
]
],
"peso muerto con landmine": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"cuadriceps"
]
],
"landmine half-kneeling single arm press": [
[
"deltoide_anterior",
"pectoral_superior"
],
[
"triceps",
"oblicuos"
]
],
"press a una mano de rodillas con landmine": [
[
"deltoide_anterior",
"pectoral_superior"
],
[
"triceps",
"oblicuos"
]
],
"landmine rdl": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"erectores"
]
],
"peso muerto rumano con landmine": [
[
"isquiotibiales",
"gluteo_mayor"
],
[
"erectores"
]
],
"landmine rotational clean and press": [
[
"gluteo_mayor",
"deltoide_anterior",
"oblicuos"
],
[
"cuadriceps",
"isquiotibiales",
"triceps"
]
],
"cargada y press rotacional con landmine": [
[
"gluteo_mayor",
"deltoide_anterior",
"oblicuos"
],
[
"cuadriceps",
"isquiotibiales",
"triceps"
]
],
"leg press machine calf raise": [
[
"gemelos"
],
[]
],
"gemelo en prensa": [
[
"gemelos"
],
[]
],
"lying hip abductions": [
[
"gluteo_medio"
],
[
"abductores",
"gluteo_mayor"
]
],
"abducción de cadera tumbado": [
[
"gluteo_medio"
],
[
"abductores",
"gluteo_mayor"
]
],
"machine assisted dip": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"fondos asistidos en máquina": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"machine assisted parallel grip pull up": [
[
"dorsal_ancho",
"biceps"
],
[
"trapecio_medio",
"braquial"
]
],
"dominada asistida agarre paralelo": [
[
"dorsal_ancho",
"biceps"
],
[
"trapecio_medio",
"braquial"
]
],
"machine assisted wide grip pull up": [
[
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"trapecio_inferior"
]
],
"dominada asistida agarre ancho": [
[
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"trapecio_inferior"
]
],
"machine lateral raise": [
[
"deltoide_lateral"
],
[
"deltoide_posterior",
"trapecio_superior"
]
],
"elevación lateral en máquina": [
[
"deltoide_lateral"
],
[
"deltoide_posterior",
"trapecio_superior"
]
],
"machine lying leg curl": [
[
"isquiotibiales"
],
[
"gemelos"
]
],
"curl femoral tumbado en máquina": [
[
"isquiotibiales"
],
[
"gemelos"
]
],
"machine preacher curl": [
[
"biceps"
],
[
"braquial"
]
],
"curl predicador en máquina": [
[
"biceps"
],
[
"braquial"
]
],
"machine seated calf raise": [
[
"gemelos"
],
[]
],
"gemelo sentado en máquina": [
[
"gemelos"
],
[]
],
"machine seated chest fly": [
[
"pectoral_mayor"
],
[
"deltoide_anterior"
]
],
"aperturas en máquina": [
[
"pectoral_mayor"
],
[
"deltoide_anterior"
]
],
"machine seated chest press": [
[
"pectoral_mayor"
],
[
"deltoide_anterior",
"triceps"
]
],
"press de pecho sentado en máquina": [
[
"pectoral_mayor"
],
[
"deltoide_anterior",
"triceps"
]
],
"machine seated hip adduction": [
[
"aductores"
],
[]
],
"aductores en máquina": [
[
"aductores"
],
[]
],
"machine seated leg curl": [
[
"isquiotibiales"
],
[]
],
"curl femoral sentado en máquina": [
[
"isquiotibiales"
],
[]
],
"machine seated leg extension": [
[
"cuadriceps"
],
[]
],
"extensión de cuádriceps en máquina": [
[
"cuadriceps"
],
[]
],
"machine seated parallel grip shoulder press": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps"
]
],
"press de hombro agarre paralelo en máquina": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps"
]
],
"machine seated reverse fly": [
[
"deltoide_posterior",
"trapecio_medio"
],
[
"romboides"
]
],
"pájaro en máquina": [
[
"deltoide_posterior",
"trapecio_medio"
],
[
"romboides"
]
],
"machine seated shoulder press": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior"
]
],
"press de hombro sentado en máquina": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps",
"trapecio_superior"
]
],
"machine seated single arm neutral grip row": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"biceps",
"deltoide_posterior"
]
],
"remo a una mano en máquina agarre neutro": [
[
"dorsal_ancho",
"trapecio_medio"
],
[
"biceps",
"deltoide_posterior"
]
],
"machine standing calf raise": [
[
"gemelos"
],
[]
],
"gemelo de pie en máquina": [
[
"gemelos"
],
[]
],
"medicine ball slam with squat jump": [
[
"cuadriceps",
"gluteo_mayor",
"dorsal_ancho"
],
[
"recto_abdominal",
"deltoide_anterior",
"gemelos"
]
],
"golpe de balón medicinal con salto": [
[
"cuadriceps",
"gluteo_mayor",
"dorsal_ancho"
],
[
"recto_abdominal",
"deltoide_anterior",
"gemelos"
]
],
"mini band alternating hip abduction": [
[
"gluteo_medio"
],
[
"abductores",
"gluteo_mayor"
]
],
"abducción de cadera alterna con banda": [
[
"gluteo_medio"
],
[
"abductores",
"gluteo_mayor"
]
],
"mini band bent over y's": [
[
"trapecio_inferior",
"deltoide_posterior"
],
[
"trapecio_medio",
"deltoide_lateral",
"erectores"
]
],
"y con banda inclinado": [
[
"trapecio_inferior",
"deltoide_posterior"
],
[
"trapecio_medio",
"deltoide_lateral",
"erectores"
]
],
"mini band delt raises": [
[
"deltoide_lateral",
"deltoide_anterior"
],
[
"trapecio_superior",
"manguito_rotador"
]
],
"elevación de deltoides con banda": [
[
"deltoide_lateral",
"deltoide_anterior"
],
[
"trapecio_superior",
"manguito_rotador"
]
],
"mini band side lying hip abduction": [
[
"gluteo_medio"
],
[
"abductores"
]
],
"abducción de cadera tumbado con banda": [
[
"gluteo_medio"
],
[
"abductores"
]
],
"mini band wall sit": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"abductores",
"gluteo_medio"
]
],
"sentadilla isométrica en pared con banda": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"abductores",
"gluteo_medio"
]
],
"mini band wall sit with abductions": [
[
"cuadriceps",
"gluteo_medio"
],
[
"abductores",
"gluteo_mayor"
]
],
"sentadilla isométrica en pared con abducción": [
[
"cuadriceps",
"gluteo_medio"
],
[
"abductores",
"gluteo_mayor"
]
],
"mountain climber": [
[
"recto_abdominal",
"psoas"
],
[
"deltoide_anterior",
"cuadriceps"
]
],
"escalador": [
[
"recto_abdominal",
"psoas"
],
[
"deltoide_anterior",
"cuadriceps"
]
],
"muscle up": [
[
"dorsal_ancho",
"pectoral_mayor",
"triceps"
],
[
"biceps",
"deltoide_anterior",
"recto_abdominal"
]
],
"pallof press": [
[
"oblicuos",
"transverso"
],
[
"recto_abdominal",
"deltoide_anterior"
]
],
"press pallof": [
[
"oblicuos",
"transverso"
],
[
"recto_abdominal",
"deltoide_anterior"
]
],
"pilates - oblique twists with ball": [
[
"oblicuos"
],
[
"recto_abdominal"
]
],
"giros de oblicuos con balón": [
[
"oblicuos"
],
[
"recto_abdominal"
]
],
"plank to push up": [
[
"recto_abdominal",
"triceps"
],
[
"pectoral_mayor",
"deltoide_anterior"
]
],
"de plancha a flexión": [
[
"recto_abdominal",
"triceps"
],
[
"pectoral_mayor",
"deltoide_anterior"
]
],
"plate hip thrust": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"hip thrust con disco": [
[
"gluteo_mayor"
],
[
"isquiotibiales"
]
],
"plate russian twist": [
[
"oblicuos"
],
[
"recto_abdominal",
"psoas"
]
],
"giro ruso con disco": [
[
"oblicuos"
],
[
"recto_abdominal",
"psoas"
]
],
"plate weighted dip": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"fondos lastrados": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior"
]
],
"plate weighted wide grip pull up": [
[
"dorsal_ancho",
"biceps"
],
[
"trapecio_medio",
"deltoide_posterior",
"antebrazo"
]
],
"dominada lastrada agarre ancho": [
[
"dorsal_ancho",
"biceps"
],
[
"trapecio_medio",
"deltoide_posterior",
"antebrazo"
]
],
"pull up": [
[
"dorsal_ancho",
"biceps"
],
[
"trapecio_medio",
"deltoide_posterior",
"antebrazo"
]
],
"dominada": [
[
"dorsal_ancho",
"biceps"
],
[
"trapecio_medio",
"deltoide_posterior",
"antebrazo"
]
],
"push up": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior",
"recto_abdominal"
]
],
"flexión de brazos": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior",
"recto_abdominal"
]
],
"reverse nordic curl band assisted": [
[
"cuadriceps"
],
[
"psoas",
"recto_abdominal"
]
],
"nórdico inverso asistido con banda": [
[
"cuadriceps"
],
[
"psoas",
"recto_abdominal"
]
],
"scapular pushups from elbows": [
[
"deltoide_anterior"
],
[
"recto_abdominal",
"trapecio_medio",
"transverso"
]
],
"flexión escapular desde codos": [
[
"deltoide_anterior"
],
[
"recto_abdominal",
"trapecio_medio",
"transverso"
]
],
"seated dumbbell front raise to lateral raise": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"trapecio_superior"
]
],
"elevación frontal a lateral sentado": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"trapecio_superior"
]
],
"seated dumbbell hammer curl to neutral press": [
[
"biceps",
"deltoide_anterior"
],
[
"braquial",
"triceps"
]
],
"curl martillo sentado a press neutro": [
[
"biceps",
"deltoide_anterior"
],
[
"braquial",
"triceps"
]
],
"seated hip twist": [
[
"oblicuos"
],
[
"recto_abdominal",
"erectores"
]
],
"giro de cadera sentado": [
[
"oblicuos"
],
[
"recto_abdominal",
"erectores"
]
],
"seated leg press": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"prensa sentado": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"seated machine ab crunch": [
[
"recto_abdominal"
],
[
"oblicuos"
]
],
"crunch abdominal en máquina": [
[
"recto_abdominal"
],
[
"oblicuos"
]
],
"smith machine back squat": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"sentadilla trasera en multipower": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"smith machine bench press": [
[
"pectoral_mayor"
],
[
"triceps",
"deltoide_anterior"
]
],
"press banca en multipower": [
[
"pectoral_mayor"
],
[
"triceps",
"deltoide_anterior"
]
],
"smith machine deadlift": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"trapecio_medio",
"antebrazo"
]
],
"peso muerto en multipower": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores",
"trapecio_medio",
"antebrazo"
]
],
"smith machine incline bench press": [
[
"pectoral_superior"
],
[
"deltoide_anterior",
"triceps"
]
],
"press inclinado en multipower": [
[
"pectoral_superior"
],
[
"deltoide_anterior",
"triceps"
]
],
"smith machine seated shoulder press": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps"
]
],
"press de hombro sentado en multipower": [
[
"deltoide_anterior",
"deltoide_lateral"
],
[
"triceps"
]
],
"smith machine shrug": [
[
"trapecio_superior"
],
[
"trapecio_medio"
]
],
"encogimiento de trapecio en multipower": [
[
"trapecio_superior"
],
[
"trapecio_medio"
]
],
"smith machine sumo deadlift": [
[
"gluteo_mayor",
"aductores"
],
[
"isquiotibiales",
"erectores",
"trapecio_medio"
]
],
"peso muerto sumo en multipower": [
[
"gluteo_mayor",
"aductores"
],
[
"isquiotibiales",
"erectores",
"trapecio_medio"
]
],
"spiderman push up": [
[
"pectoral_mayor",
"triceps"
],
[
"oblicuos",
"deltoide_anterior",
"psoas"
]
],
"flexión spiderman": [
[
"pectoral_mayor",
"triceps"
],
[
"oblicuos",
"deltoide_anterior",
"psoas"
]
],
"split squat pulse": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"rebotes en zancada": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"squat jump": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"sentadilla con salto": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"squat pulse": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"rebotes en sentadilla": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"aductores",
"isquiotibiales"
]
],
"squat to squat jump": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"sentadilla a sentadilla con salto": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"gemelos"
]
],
"superband anchored pistol squat to row": [
[
"cuadriceps",
"gluteo_mayor",
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"transverso"
]
],
"sentadilla a una pierna con remo en superbanda": [
[
"cuadriceps",
"gluteo_mayor",
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"transverso"
]
],
"superband anchored tricep pushdown": [
[
"triceps"
],
[]
],
"extensión de tríceps con banda anclada": [
[
"triceps"
],
[]
],
"superband deadlift": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores"
]
],
"peso muerto con superbanda": [
[
"gluteo_mayor",
"isquiotibiales"
],
[
"erectores"
]
],
"superband push up": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior",
"recto_abdominal"
]
],
"flexión con superbanda": [
[
"pectoral_mayor",
"triceps"
],
[
"deltoide_anterior",
"recto_abdominal"
]
],
"superband single arm row": [
[
"dorsal_ancho"
],
[
"trapecio_medio",
"biceps",
"deltoide_posterior"
]
],
"remo a una mano con banda": [
[
"dorsal_ancho"
],
[
"trapecio_medio",
"biceps",
"deltoide_posterior"
]
],
"superband pull apart": [
[
"deltoide_posterior",
"trapecio_medio"
],
[
"romboides",
"trapecio_superior"
]
],
"apertura con superbanda": [
[
"deltoide_posterior",
"trapecio_medio"
],
[
"romboides",
"trapecio_superior"
]
],
"superband squat": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"sentadilla con superbanda": [
[
"cuadriceps",
"gluteo_mayor"
],
[
"isquiotibiales",
"aductores"
]
],
"superman around the world": [
[
"erectores",
"gluteo_mayor"
],
[
"deltoide_posterior",
"trapecio_medio",
"trapecio_superior",
"isquiotibiales"
]
],
"superman con círculos de brazos": [
[
"erectores",
"gluteo_mayor"
],
[
"deltoide_posterior",
"trapecio_medio",
"trapecio_superior",
"isquiotibiales"
]
],
"wide grip lat pulldown": [
[
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"trapecio_inferior"
]
],
"jalón al pecho agarre ancho": [
[
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"trapecio_inferior"
]
],
"wide grip pull up": [
[
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"trapecio_inferior"
]
],
"dominada agarre ancho": [
[
"dorsal_ancho"
],
[
"biceps",
"trapecio_medio",
"trapecio_inferior"
]
]
};

export function completarMusculos(e) {
  if (!e || (Array.isArray(e.musculos_primarios) && e.musculos_primarios.length)) return e;
  const m = MUSCULOS[String(e.alias || '').toLowerCase()] || MUSCULOS[String(e.nombre || '').toLowerCase()];
  if (!m) return e;
  return { ...e, musculos_primarios: m[0], musculos_secundarios: (e.musculos_secundarios && e.musculos_secundarios.length) ? e.musculos_secundarios : m[1] };
}
