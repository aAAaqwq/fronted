import React from 'react';

const Card = ({ children, className = '', title, extra }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      {(title || extra) && (
        <div className="px-6 py-4 border-b flex items-center justify-between">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

export default Card;
