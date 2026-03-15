import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { cardAPI, tenantAPI } from "../services/api";
import { 
  FaArrowLeft, 
  FaIdCard, 
  FaGraduationCap, 
  FaUsers, 
  FaUserShield, 
  FaPhone, 
  FaLink, 
  FaCopy,
  FaCheckCircle,
  FaTimesCircle,
  FaHospital,
  FaBriefcase,
  FaEnvelope
} from "react-icons/fa";

// ===== COLOR THEME - Change colors from here =====
const THEME = {
  primary: "purple-600", // Main brand color
  primaryDark: "purple-800", // Darker shade
  primaryLight: "purple-100", // Light shade
  accent: "purple-500", // Accent color
  gradientFrom: "purple-600", // Gradient start
  gradientTo: "indigo-600", // Gradient end
};
// ==================================================

function CardView() {
  const { tagId } = useParams();
  const navigate = useNavigate();
  const [card, setCard] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Decode the tagId in case it's URL encoded (React Router should do this automatically)
  const decodedTagId = decodeURIComponent(tagId);
  
  console.log("Original tagId:", tagId);
  console.log("Decoded tagId:", decodedTagId);

  useEffect(() => {
    fetchCard();
  }, [tagId]);

  const fetchCard = async () => {
    try {
      setLoading(true);
      // Get tenantId from URL query params or localStorage
      const params = new URLSearchParams(window.location.search);
      let tenantId = params.get("tenantId");
      
      // Fallback to localStorage if not in URL
      if (!tenantId) {
        tenantId = localStorage.getItem("selectedTenantId");
      }

      if (!tenantId) {
        setError("Tenant ID is required. Please select a tenant from the dashboard.");
        setLoading(false);
        return;
      }

      console.log('=== CardView Fetch Debug ===');
      console.log('Fetching card:', tagId);
      console.log('Using tenantId:', tenantId);
      console.log('============================');

      // Fetch card data - tagId is already decoded by React Router
      const cardResponse = await cardAPI.getById(tagId, tenantId);
      setCard(cardResponse.data.data);

      // Fetch all tenants to get tenant info
      const tenantResponse = await tenantAPI.getAll();
      const currentTenant = tenantResponse.data.data.find(t => t.tenantId === tenantId);
      setTenant(currentTenant);

      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch card");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // Helper function to get icon and color based on field name
  const getFieldIcon = (fieldName) => {
    const iconMap = {
      email: { icon: FaEnvelope, color: 'blue' },
      phone: { icon: FaPhone, color: 'green' },
      studentId: { icon: FaIdCard, color: 'blue' },
      employeeId: { icon: FaIdCard, color: 'blue' },
      grade: { icon: FaGraduationCap, color: 'green' },
      section: { icon: FaUsers, color: 'amber' },
      guardianName: { icon: FaUserShield, color: 'purple' },
      guardianPhone: { icon: FaPhone, color: 'purple' },
      department: { icon: FaHospital, color: 'red' },
      specialization: { icon: FaUsers, color: 'green' },
      licenseNumber: { icon: FaIdCard, color: 'amber' },
      emergencyContact: { icon: FaPhone, color: 'red' },
      company: { icon: FaBriefcase, color: 'blue' },
      position: { icon: FaIdCard, color: 'green' },
      linkedIn: { icon: FaLink, color: 'blue' },
      website: { icon: FaLink, color: 'purple' },
    };
    
    return iconMap[fieldName] || { icon: FaIdCard, color: 'gray' };
  };

  // Helper function to format field name to readable label
  const formatFieldName = (fieldName) => {
    // Convert camelCase to Title Case with spaces
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Helper function to check if value is a URL
  const isUrl = (value) => {
    if (typeof value !== 'string') return false;
    return value.startsWith('http://') || value.startsWith('https://');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-purple-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading card details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-linear-to-br from-red-50 via-white to-orange-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-red-200 max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <FaTimesCircle className="text-4xl text-red-600" />
          </div>
          <p className="text-red-800 text-center font-medium mb-6">{error}</p>
          <button
            className="w-full px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            onClick={() => navigate("/")}
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-linear-to-br from-gray-50 via-white to-slate-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-gray-200 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <FaTimesCircle className="text-4xl text-gray-600" />
          </div>
          <p className="text-gray-800 font-medium mb-6">Card not found</p>
          <button
            className="w-full px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            onClick={() => navigate("/")}
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-100 via-purple-50 to-pink-100 py-8 px-4">
      {/* Floating Back Button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-6 left-6 z-50 bg-white p-3 rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 border-2 border-purple-300"
      >
        <FaArrowLeft className="text-purple-600 text-xl" />
      </button>

      {/* Main Card Container */}
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden relative">
          
          {/* Cover Banner with Gradient Pattern */}
          <div className="relative h-64 bg-linear-to-br from-purple-600 via-indigo-600 to-purple-800 overflow-hidden">
           
          
            {/* <div className="absolute top-6 right-6 flex flex-col gap-2">
              <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${card.isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} shadow-xl backdrop-blur-sm`}>
                {card.isActive ? <FaCheckCircle /> : <FaTimesCircle />}
                {card.isActive ? 'Active' : 'Inactive'}
              </div>
              <div className="px-4 py-2 rounded-full text-sm font-bold bg-white bg-opacity-90 text-purple-700 shadow-xl backdrop-blur-sm">
                {card.tapCount} Taps
              </div>
            </div> */}
          </div>

          {/* Profile Section - Overlapping Cover */}
          <div className="relative px-8 -mt-24 mb-6">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
              {/* Profile Picture */}
              <div className="relative group">
                <div className="w-40 h-40 rounded-full border-8 border-white shadow-2xl overflow-hidden bg-linear-to-br from-purple-400 via-pink-400 to-indigo-400 transform group-hover:scale-105 transition-all duration-300">
                  {/* Placeholder Avatar - Using Gradient with Initial */}
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-7xl font-bold text-white drop-shadow-2xl">
                      {card.metadata?.name?.charAt(0)?.toUpperCase() || 'N'}
                    </span>
                  </div>
                </div>
                {/* Online Indicator */}
                <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg"></div>
              </div>

              {/* Name & Info */}
              <div className="flex-1 text-center md:text-left md:pb-4 mt-4 md:mt-0">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 leading-tight">
                  {card.metadata?.name || 'No Name'}
                </h1>
                <p className="text-xl text-purple-200 font-semibold mb-3">
                  {card.metadata?.title || tenant?.name || 'Digital Card'}
                </p>
                <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full shadow-md">
                  <FaIdCard className="text-purple-600" />
                  <span className="text-sm font-mono text-gray-700">ID: {card.tagId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-8 pb-8">
            
            {/* Dynamic Information Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  {tenant?.type === 'SCHOOL' && <FaGraduationCap className="text-white text-2xl" />}
                  {tenant?.type === 'HOSPITAL' && <FaHospital className="text-white text-2xl" />}
                  {tenant?.type === 'BUSINESS' && <FaBriefcase className="text-white text-2xl" />}
                  {!['SCHOOL', 'HOSPITAL', 'BUSINESS'].includes(tenant?.type) && <FaIdCard className="text-white text-2xl" />}
                </div>
                <h2 className="text-3xl font-bold text-gray-900">
                  {tenant?.name || 'Information'}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Dynamically render all metadata fields */}
                {card.metadata && Object.entries(card.metadata).map(([key, value]) => {
                  // Skip if value is empty, null, undefined, or is 'name' or 'title' (already shown in header)
                  if (!value || key === 'name' || key === 'title' || key === 'custom') return null;
                  
                  const { icon: Icon, color } = getFieldIcon(key);
                  const label = formatFieldName(key);
                  const isLink = isUrl(value);
                  
                  return (
                    <div 
                      key={key} 
                      className="bg-linear-to-br from-white to-gray-50 p-5 rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-100"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                          <Icon className={`text-${color}-600 text-xl`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
                          {isLink ? (
                            <a
                              href={value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base font-semibold text-blue-600 hover:text-blue-800 underline break-all"
                            >
                              {value}
                            </a>
                          ) : (
                            <div className="text-base font-bold text-gray-900 wrap-break-word">{value}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Links Section */}
            {card.businessUrl && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-linear-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FaLink className="text-white text-2xl" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Quick Links
                  </h2>
                </div>
                
                <div className="bg-linear-to-br from-purple-50 to-indigo-50 p-6 rounded-2xl shadow-lg border-2 border-purple-200">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                      <FaLink className="text-white text-2xl" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2">Redirect URL</div>
                      <a
                        href={card.businessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-purple-700 hover:text-purple-900 underline break-all block mb-4"
                      >
                        {card.businessUrl}
                      </a>
                      <button
                        onClick={() => copyToClipboard(card.businessUrl)}
                        className="px-6 py-3 bg-linear-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center gap-2"
                      >
                        <FaCopy />
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CardView;
