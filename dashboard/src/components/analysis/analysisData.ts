export type ModelKey = "logreg" | "knn" | "nb";
export type SplitKey = "temporal" | "cv";
export type MetricKey = "rocAuc" | "f1" | "precision" | "recall" | "averagePrecision";

export type ModelMetric = {
  key: ModelKey;
  name: string;
  shortName: string;
  color: string;
  temporal: {
    accuracy: number;
    balancedAccuracy: number;
    precision: number;
    recall: number;
    f1: number;
    rocAuc: number;
    averagePrecision: number;
    tn: number;
    fp: number;
    fn: number;
    tp: number;
  };
  cv: {
    precision: number;
    recall: number;
    f1: number;
    rocAuc: number;
    averagePrecision: number;
  };
  note: string;
};

export const metricLabels: Record<MetricKey, string> = {
  rocAuc: "ROC-AUC",
  f1: "F1",
  precision: "Precision",
  recall: "Recall",
  averagePrecision: "Avg Precision",
};

export const models: ModelMetric[] = [
  {
    key: "logreg",
    name: "Logistic Regression L1 core",
    shortName: "LogReg",
    color: "#58b8c8",
    temporal: {
      accuracy: 0.587,
      balancedAccuracy: 0.647,
      precision: 0.3,
      recall: 0.75,
      f1: 0.429,
      rocAuc: 0.705,
      averagePrecision: 0.413,
      tn: 92,
      fp: 77,
      fn: 11,
      tp: 33,
    },
    cv: {
      precision: 0.421,
      recall: 0.68,
      f1: 0.52,
      rocAuc: 0.746,
      averagePrecision: 0.49,
    },
    note: "Mejor balance temporal: F1, ROC-AUC, AP e interpretabilidad.",
  },
  {
    key: "knn",
    name: "KNN k=15 scaled",
    shortName: "KNN",
    color: "#d6a24a",
    temporal: {
      accuracy: 0.718,
      balancedAccuracy: 0.545,
      precision: 0.289,
      recall: 0.25,
      f1: 0.268,
      rocAuc: 0.642,
      averagePrecision: 0.295,
      tn: 142,
      fp: 27,
      fn: 33,
      tp: 11,
    },
    cv: {
      precision: 0.39,
      recall: 0.34,
      f1: 0.364,
      rocAuc: 0.702,
      averagePrecision: 0.47,
    },
    note: "Reduce falsas alarmas, pero omite 33 de 44 letales en mayo.",
  },
  {
    key: "nb",
    name: "Gaussian Naive Bayes",
    shortName: "Naive Bayes",
    color: "#6cc18f",
    temporal: {
      accuracy: 0.291,
      balancedAccuracy: 0.553,
      precision: 0.226,
      recall: 1,
      f1: 0.368,
      rocAuc: 0.556,
      averagePrecision: 0.227,
      tn: 18,
      fp: 151,
      fn: 0,
      tp: 44,
    },
    cv: {
      precision: 0.24,
      recall: 0.96,
      f1: 0.384,
      rocAuc: 0.57,
      averagePrecision: 0.24,
    },
    note: "Recall perfecto, pero con 151 falsas alarmas.",
  },
];

export const rocCurves: Record<ModelKey, Array<[number, number]>> = {
  logreg: [[0, 0], [0.07, 0.18], [0.16, 0.39], [0.28, 0.57], [0.46, 0.75], [0.68, 0.87], [1, 1]],
  knn: [[0, 0], [0.05, 0.1], [0.13, 0.24], [0.27, 0.42], [0.48, 0.62], [0.72, 0.82], [1, 1]],
  nb: [[0, 0], [0.22, 0.5], [0.44, 0.7], [0.62, 0.82], [0.82, 0.94], [1, 1]],
};

export const prCurves: Record<ModelKey, Array<[number, number]>> = {
  logreg: [[0, 0.78], [0.18, 0.63], [0.36, 0.51], [0.58, 0.4], [0.75, 0.3], [1, 0.21]],
  knn: [[0, 0.66], [0.16, 0.52], [0.32, 0.39], [0.52, 0.31], [0.7, 0.25], [1, 0.21]],
  nb: [[0, 0.38], [0.28, 0.3], [0.56, 0.25], [0.82, 0.23], [1, 0.21]],
};

export const logregCoefficients = [
  { feature: "target_type_civilian", coefficient: 0.88 },
  { feature: "country_Iraq", coefficient: 0.401 },
  { feature: "target_type_unknown", coefficient: 0.391 },
  { feature: "civilian_targeting_True", coefficient: 0.34 },
  { feature: "is_airstrike", coefficient: 0.237 },
  { feature: "latitude", coefficient: 0.127 },
  { feature: "actor1_infrequent", coefficient: 0.118 },
  { feature: "days_since_last_attack", coefficient: 0.041 },
  { feature: "is_explosive_ied", coefficient: 0.02 },
  { feature: "is_chemical", coefficient: -0.005 },
  { feature: "is_drone", coefficient: -0.021 },
  { feature: "past_fatalities_7d", coefficient: -0.028 },
  { feature: "target_type_infrastructure", coefficient: -0.05 },
  { feature: "attacker_is_houthi", coefficient: -0.06 },
  { feature: "past_attacks_30d", coefficient: -0.075 },
  { feature: "attacker_category_state", coefficient: -0.088 },
  { feature: "attacker_is_hezbollah", coefficient: -0.098 },
  { feature: "civilian_targeting_False", coefficient: -0.109 },
  { feature: "longitude", coefficient: -0.12 },
  { feature: "is_missile", coefficient: -0.142 },
  { feature: "is_interception", coefficient: -0.196 },
  { feature: "sub_event_Disrupted weapons", coefficient: -0.218 },
  { feature: "country_Israel", coefficient: -0.631 },
];

export const knnSensitivity = [
  { k: 1, f1: 0.428, rocAuc: 0.627, averagePrecision: 0.317 },
  { k: 3, f1: 0.405, rocAuc: 0.667, averagePrecision: 0.406 },
  { k: 5, f1: 0.369, rocAuc: 0.678, averagePrecision: 0.446 },
  { k: 7, f1: 0.399, rocAuc: 0.69, averagePrecision: 0.456 },
  { k: 9, f1: 0.378, rocAuc: 0.696, averagePrecision: 0.465 },
  { k: 11, f1: 0.368, rocAuc: 0.704, averagePrecision: 0.469 },
  { k: 13, f1: 0.366, rocAuc: 0.702, averagePrecision: 0.469 },
  { k: 15, f1: 0.364, rocAuc: 0.702, averagePrecision: 0.47 },
  { k: 17, f1: 0.345, rocAuc: 0.7, averagePrecision: 0.469 },
  { k: 21, f1: 0.339, rocAuc: 0.696, averagePrecision: 0.465 },
  { k: 25, f1: 0.315, rocAuc: 0.699, averagePrecision: 0.463 },
  { k: 29, f1: 0.305, rocAuc: 0.708, averagePrecision: 0.469 },
];

export const thresholdSeries = [
  { threshold: 0.1, precision: 0.23, recall: 1, f1: 0.374 },
  { threshold: 0.2, precision: 0.26, recall: 0.93, f1: 0.406 },
  { threshold: 0.3, precision: 0.29, recall: 0.84, f1: 0.431 },
  { threshold: 0.4, precision: 0.31, recall: 0.78, f1: 0.444 },
  { threshold: 0.5, precision: 0.3, recall: 0.75, f1: 0.429 },
  { threshold: 0.6, precision: 0.37, recall: 0.48, f1: 0.418 },
  { threshold: 0.7, precision: 0.45, recall: 0.3, f1: 0.36 },
  { threshold: 0.8, precision: 0.55, recall: 0.14, f1: 0.223 },
  { threshold: 0.9, precision: 0.68, recall: 0.05, f1: 0.093 },
];

export const probabilityBins: Record<ModelKey, { bin: string; nonFatal: number; fatal: number }[]> = {
  logreg: [
    { bin: "0-.2", nonFatal: 28, fatal: 2 },
    { bin: ".2-.4", nonFatal: 36, fatal: 6 },
    { bin: ".4-.6", nonFatal: 46, fatal: 13 },
    { bin: ".6-.8", nonFatal: 39, fatal: 18 },
    { bin: ".8-1", nonFatal: 20, fatal: 5 },
  ],
  knn: [
    { bin: "0-.2", nonFatal: 78, fatal: 16 },
    { bin: ".2-.4", nonFatal: 54, fatal: 17 },
    { bin: ".4-.6", nonFatal: 21, fatal: 7 },
    { bin: ".6-.8", nonFatal: 11, fatal: 3 },
    { bin: ".8-1", nonFatal: 5, fatal: 1 },
  ],
  nb: [
    { bin: "0-.2", nonFatal: 7, fatal: 0 },
    { bin: ".2-.4", nonFatal: 11, fatal: 0 },
    { bin: ".4-.6", nonFatal: 35, fatal: 5 },
    { bin: ".6-.8", nonFatal: 58, fatal: 18 },
    { bin: ".8-1", nonFatal: 58, fatal: 21 },
  ],
};

