import { POINT, RULE } from "./copy-tokens";

export function buildPurohitMainMenu(): { type: "interactive"; interactive: Record<string, unknown> } {
  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: `🙏 *Pranaam, Pandit Ji!*\n_आपकी स्मरण सेवा में स्वागत है_\n${RULE}\n${POINT} कृपया नीचे दिए गए मेनू से एक विकल्प चुनें:`,
      },
      action: {
        button: "मेनू खोलें",
        sections: [
          {
            title: "विकल्प",
            rows: [
              { id: "menu_purohit_my_week", title: "इस हफ्ते के कार्य" },
              { id: "menu_purohit_add_yajman", title: "नया यजमान जोड़ें" },
              { id: "menu_purohit_pending_dakshina", title: "📿 लंबित दक्षिणा" },
              { id: "menu_purohit_referral", title: "✉️ आमंत्रण भेजें" },
            ],
          },
        ],
      },
    },
  };
}

export function buildYajmanMainMenu(): { type: "interactive"; interactive: Record<string, unknown> } {
  return {
    type: "interactive",
    interactive: {
      type: "list",
      body: {
        text: `🙏 *Pranaam!*\n_आपके परिवार के आध्यात्मिक कैलेंडर में स्वागत है_\n${RULE}\n${POINT} जानकारी के लिए कृपया नीचे दिए गए विकल्पों में से चुनें:`,
      },
      action: {
        button: "मेनू खोलें",
        sections: [
          {
            title: "जानकारी",
            rows: [
              { id: "menu_yajman_mera_saal", title: "मेरा साल" },
              { id: "menu_yajman_mera_mahina", title: "मेरा महीना" },
              { id: "menu_yajman_mera_smaran", title: "📿 मेरा स्मरण" },
              { id: "menu_yajman_agle_karya", title: "🔔 अगले कार्य" },
            ],
          },
        ],
      },
    },
  };
}
