import ar from "@gaming-zone/locales/ar.json";
import en from "@gaming-zone/locales/en.json";

const dictionaries: Record<string, any> = { ar, en };

export function getTranslations(locale: string) {
  const dictionary = dictionaries[locale] || dictionaries["en"];

  const t = (key: string, replacements?: Record<string, string | number>) => {
    const parts = key.split(".");
    let value = dictionary;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        // Fallback to English dictionary if not found in current dictionary
        let enValue = en as any;
        for (const enPart of parts) {
          if (enValue && typeof enValue === "object" && enPart in enValue) {
            enValue = enValue[enPart];
          } else {
            enValue = null;
            break;
          }
        }
        value = enValue || key;
        break;
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    // Handle replacements (e.g. {{category}} -> value)
    if (replacements) {
      let replaced = value;
      Object.entries(replacements).forEach(([k, val]) => {
        replaced = replaced.replace(new RegExp(`{{${k}}}`, "g"), String(val));
      });
      return replaced;
    }

    return value;
  };

  return t;
}
