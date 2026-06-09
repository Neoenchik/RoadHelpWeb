from aiogram.fsm.state import State, StatesGroup


class OrderCreation(StatesGroup):
    choosing_service = State()
    sending_location = State()
    confirming = State()
    waiting_for_match = State()


class OrderReview(StatesGroup):
    waiting_for_score = State()
    waiting_for_comment = State()
