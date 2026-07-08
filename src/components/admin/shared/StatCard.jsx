const StatCard = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="a-kpi">
      <div className="flex items-center justify-between">
        <p className="a-muted" style={{ fontSize: 12.5, fontWeight: 500 }}>{title}</p>
        {/* icon square tinted from the icon's own colour → works in light & dark */}
        <div className={`a-kpi-ico ${color || ''}`} style={{ background: 'color-mix(in srgb, currentColor 13%, transparent)' }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="a-kpi-val">{value}</p>
    </div>
  );
};

export default StatCard;