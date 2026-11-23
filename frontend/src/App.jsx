import { Link, Route, Routes } from 'react-router-dom';
import { DashboardLayout, Protected, StoreLayout } from './components/Layouts';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { OrderDetail, Orders } from './pages/Orders';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import { Login, Register } from './pages/Auth';
import Overview from './pages/dashboard/Overview';
import ManageProducts from './pages/dashboard/ManageProducts';
import Inventory from './pages/dashboard/Inventory';
import DashOrders from './pages/dashboard/DashOrders';
import Reports from './pages/dashboard/Reports';
import Users from './pages/dashboard/Users';
import Categories from './pages/dashboard/Categories';
import Coupons from './pages/dashboard/Coupons';
import { Empty } from './components/ui';

const NotFound = () => <Empty title="Page not found" hint="The page you're looking for doesn't exist." action={<Link to="/" className="btn-primary mt-2">Go home</Link>} />;

export default function App() {
  const customer = (el) => <Protected roles={['customer']}>{el}</Protected>;
  return (
    <Routes>
      <Route element={<StoreLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="cart" element={customer(<Cart />)} />
        <Route path="checkout" element={customer(<Checkout />)} />
        <Route path="orders" element={customer(<Orders />)} />
        <Route path="orders/:id" element={customer(<OrderDetail />)} />
        <Route path="wishlist" element={customer(<Wishlist />)} />
        <Route path="profile" element={<Protected><Profile /></Protected>} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="dashboard" element={<Protected roles={['seller', 'admin']}><DashboardLayout /></Protected>}>
        <Route index element={<Overview />} />
        <Route path="products" element={<ManageProducts />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="orders" element={<DashOrders />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Protected roles={['admin']}><Users /></Protected>} />
        <Route path="categories" element={<Protected roles={['admin']}><Categories /></Protected>} />
        <Route path="coupons" element={<Protected roles={['admin']}><Coupons /></Protected>} />
      </Route>
    </Routes>
  );
}
