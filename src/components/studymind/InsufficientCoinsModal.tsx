// Modal shown when the user lacks coins for an action.
import { Coins, ShoppingCart, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: number;
  balance: number;
  action?: string;
}

export const InsufficientCoinsModal = ({ open, onOpenChange, cost, balance, action = "this action" }: Props) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-2">
            <Coins className="h-7 w-7 text-amber-600" />
          </div>
          <DialogTitle className="text-center">Not enough coins</DialogTitle>
          <DialogDescription className="text-center">
            You need <span className="font-bold text-foreground">{cost} coins</span> to {action}.
            <br />Your balance: <span className="font-semibold">{balance} coins</span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={() => { onOpenChange(false); navigate("/missions"); }}
            className="rounded-xl py-3 px-3 bg-secondary text-foreground font-semibold text-sm tap-scale inline-flex items-center justify-center gap-1.5"
          >
            <Gift className="h-4 w-4" /> Earn coins
          </button>
          <button
            onClick={() => { onOpenChange(false); navigate("/wallet"); }}
            className="rounded-xl py-3 px-3 gradient-primary text-white font-semibold text-sm tap-scale inline-flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="h-4 w-4" /> Buy coins
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
