/**
 * Drug test profiles — 20 substances.
 *
 * Each profile documents the presumptive colour-test reaction used in the field,
 * the expected colour, a representative hex (used as the "reference colour card"
 * value for calibration / comparison), interpretation, and source.
 *
 * Sources: DEA Analysis of Drugs Manual (Appendix 1C/1D, Rev 3, 2018/2019),
 * UNODC Recommended Methods for Cocaine.
 */
export interface DrugProfile {
  id: string
  target: string
  aliases: string[]
  testMethod: string
  expectedColor: string
  /** Representative reference hex for the expected reaction colour. */
  expectedHex: string
  interpretation: string
  source: string
}

export const DRUG_PROFILES: DrugProfile[] = [
  {
    id: 'heroin-morphine-codeine-marquis',
    target: 'Heroin / Morphine / Codeine',
    aliases: ['heroin', 'morphine', 'codeine', 'opiates', 'smack'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Purple-violet',
    expectedHex: '#6B2D8C',
    interpretation:
      'Presumptive colour response consistent with heroin, morphine or codeine.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'methamphetamine-marquis',
    target: 'Methamphetamine',
    aliases: ['meth', 'methamphetamine', 'ice', 'crystal'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Orange-brown',
    expectedHex: '#B5651D',
    interpretation: 'Presumptive colour response consistent with methamphetamine.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'amphetamine-marquis',
    target: 'Amphetamine',
    aliases: ['amphetamine', 'speed'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Orange to brown',
    expectedHex: '#C46A1A',
    interpretation: 'Presumptive colour response consistent with amphetamine.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'mda-mdma-marquis',
    target: 'MDA / MDMA',
    aliases: ['mda', 'mdma', 'ecstasy', 'molly'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Purple to black',
    expectedHex: '#2B0A3D',
    interpretation: 'Presumptive colour response consistent with MDA or MDMA.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'hydrocodone-marquis',
    target: 'Hydrocodone',
    aliases: ['hydrocodone', 'vicodin'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Yellow to brown to violet',
    expectedHex: '#7C3F8A',
    interpretation: 'Presumptive colour response reported for hydrocodone.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'oxycodone-marquis',
    target: 'Oxycodone',
    aliases: ['oxycodone', 'oxycontin', 'percocet'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Yellow to brown to violet',
    expectedHex: '#7C3F8A',
    interpretation: 'Presumptive colour response reported for oxycodone.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'fentanyl-marquis',
    target: 'Fentanyl',
    aliases: ['fentanyl'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Orange',
    expectedHex: '#E8820C',
    interpretation: 'Presumptive colour response reported for fentanyl.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'phentermine-marquis',
    target: 'Phentermine',
    aliases: ['phentermine'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Orange',
    expectedHex: '#E8820C',
    interpretation: 'Presumptive colour response reported for phentermine.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'peyote-mescaline-marquis',
    target: 'Peyote / Mescaline',
    aliases: ['peyote', 'mescaline'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Orange',
    expectedHex: '#E8820C',
    interpretation: 'Presumptive colour response reported for peyote or mescaline.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'psilocin-marquis',
    target: 'Psilocin',
    aliases: ['psilocin'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Greenish-brown',
    expectedHex: '#5E4A2A',
    interpretation: 'Presumptive colour response reported for psilocin.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'psilocybin-marquis',
    target: 'Psilocybin',
    aliases: ['psilocybin', 'shrooms'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Dull orange',
    expectedHex: '#C77A2E',
    interpretation: 'Presumptive colour response reported for psilocybin.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C, Revision 3 (2018)',
  },
  {
    id: 'cocaine-scott',
    target: 'Cocaine',
    aliases: ['cocaine', 'cocaine hydrochloride', 'cocaine salt', 'coke', 'blow'],
    testMethod: 'Scott test (modified cobalt thiocyanate)',
    expectedColor: 'Blue',
    expectedHex: '#1E5BB8',
    interpretation:
      'Presumptive colour response associated with cocaine; the test is not sufficient for definitive identification.',
    source:
      'UNODC Recommended Methods for the Identification and Analysis of Cocaine in Seized Materials',
  },
  {
    id: 'diphenhydramine-marquis',
    target: 'Diphenhydramine',
    aliases: ['diphenhydramine', 'benadryl'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Yellow',
    expectedHex: '#F2C94C',
    interpretation: 'Presumptive colour response reported for diphenhydramine.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C (2018)',
  },
  {
    id: 'aspirin-marquis',
    target: 'Aspirin',
    aliases: ['aspirin', 'acetylsalicylic acid'],
    testMethod: 'Marquis reagent',
    expectedColor: 'Slow pink to rose',
    expectedHex: '#E8A0B8',
    interpretation: 'Presumptive colour response reported for aspirin.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C (2018)',
  },
  {
    id: 'acetaminophen-nitric-acid',
    target: 'Acetaminophen / Paracetamol',
    aliases: ['acetaminophen', 'paracetamol', 'tylenol'],
    testMethod: 'Concentrated nitric acid',
    expectedColor: 'Fuming orange',
    expectedHex: '#F2681A',
    interpretation: 'Presumptive colour response reported for acetaminophen/paracetamol.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C (2018)',
  },
  {
    id: 'quinine-nitric-acid',
    target: 'Quinine',
    aliases: ['quinine'],
    testMethod: 'Concentrated nitric acid',
    expectedColor: 'Fluorescence under UV light',
    expectedHex: '#9FE0A0',
    interpretation:
      'Presumptive response reported for quinine; this profile is not a simple visible-colour result.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C (2018)',
  },
  {
    id: 'quinidine-nitric-acid',
    target: 'Quinidine',
    aliases: ['quinidine'],
    testMethod: 'Concentrated nitric acid',
    expectedColor: 'Fluorescence under UV light',
    expectedHex: '#9FE0A0',
    interpretation:
      'Presumptive response reported for quinidine; this profile is not a simple visible-colour result.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C (2018)',
  },
  {
    id: 'procaine-sanchez',
    target: 'Procaine',
    aliases: ['procaine', 'novocaine'],
    testMethod: 'Sanchez reagent',
    expectedColor: 'Red',
    expectedHex: '#C0392B',
    interpretation: 'Presumptive colour response reported for procaine.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C (2018)',
  },
  {
    id: 'benzocaine-sanchez',
    target: 'Benzocaine',
    aliases: ['benzocaine'],
    testMethod: 'Sanchez reagent',
    expectedColor: 'Weak red',
    expectedHex: '#D98880',
    interpretation: 'Presumptive colour response reported for benzocaine.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1C (2018)',
  },
  {
    id: 'lidocaine-cobalt-thiocyanate',
    target: 'Lidocaine',
    aliases: ['lidocaine', 'lignocaine'],
    testMethod: 'Cobalt(II) thiocyanate with stannous chloride',
    expectedColor: 'Blue precipitate; precipitate disappears after reagent B',
    expectedHex: '#2E86C1',
    interpretation: 'Presumptive reaction reported for lidocaine hydrochloride.',
    source: 'DEA Analysis of Drugs Manual, Appendix 1D (2019)',
  },
]
