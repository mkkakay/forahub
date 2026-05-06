const ORGS = [
  "WHO", "UNICEF", "Gates Foundation", "World Bank", "UNAIDS", "Gavi",
  "Global Fund", "WFP", "Wellcome Trust", "UNFPA", "UN Women", "UNDP",
  "UNESCO", "FAO", "IOM", "MSF", "Save the Children", "Oxfam",
  "Africa CDC", "PAHO", "UNHCR", "UNEP", "Chatham House", "Brookings",
  "ODI", "Johns Hopkins", "Harvard Chan", "LSHTM", "Makerere University",
  "University of Nairobi", "Jimma University", "African Union", "ECOWAS",
  "SADC", "EAC", "Islamic Development Bank", "Aga Khan",
  "Rockefeller Foundation", "Ford Foundation",
];

export default function TrustStrip() {
  return (
    <div className="w-full bg-white py-6 px-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest text-center mb-4">
        Tracking events from 1,000+ organizations worldwide
      </p>
      <div className="overflow-hidden">
        <div className="logos-track pause-on-hover">
          {[...ORGS, ...ORGS].map((org, i) => (
            <span
              key={i}
              className="bg-gray-100 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-full mx-2 whitespace-nowrap"
            >
              {org}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
