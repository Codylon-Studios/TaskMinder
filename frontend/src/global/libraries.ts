/* eslint-disable @typescript-eslint/no-explicit-any */
// Import jQuery and Bootstrap from npm packages
import $ from "jquery";
import "bootstrap/dist/css/bootstrap.min.css";

// Import Bootstrap JavaScript components individually
import { Tooltip, Popover, Modal, Dropdown, Collapse, Carousel, Offcanvas, Toast, Tab, Alert, Button, ScrollSpy } from "bootstrap";

// Make jQuery globally available
declare global {
  interface Window {
    $: typeof $;
    jQuery: typeof $;
    bootstrap: any;
  }
}

// Attach jQuery to window object
window.$ = $;
window.jQuery = $;

// Make Bootstrap components globally available
window.bootstrap = {
  Tooltip,
  Popover,
  Modal,
  Dropdown,
  Collapse,
  Carousel,
  Offcanvas,
  Toast,
  Tab,
  Alert,
  Button,
  ScrollSpy
};

// Add Bootstrap methods to jQuery prototype for backward compatibility
($ as any).fn.tooltip = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Tooltip.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Tooltip.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.popover = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Popover.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Popover.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.modal = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Modal.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Modal.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.dropdown = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Dropdown.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Dropdown.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.collapse = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Collapse.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Collapse.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.carousel = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Carousel.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Carousel.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.offcanvas = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Offcanvas.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Offcanvas.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.toast = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Toast.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Toast.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.tab = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Tab.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Tab.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.alert = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Alert.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Alert.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.button = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = Button.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      Button.getOrCreateInstance(this, options);
    }
  });
};

($ as any).fn.scrollspy = function(options?: any) {
  return this.each(function(this: Element) {
    if (typeof options === "string") {
      const instance = ScrollSpy.getInstance(this);
      if (instance && typeof (instance as any)[options] === "function") {
        (instance as any)[options]();
      }
    } 
    else {
      ScrollSpy.getOrCreateInstance(this, options);
    }
  });
};

// Export for TypeScript module compatibility
export { $ as default };